# Role-Based Permission System — Implementation Plan

## The Core Problem First

`auth.users` (Supabase Auth) and `members` (your app table) are **completely disconnected**. Every permission decision depends on bridging them. Everything below flows from that.

---

## Phase 1 — Database Migrations (run in order)

### 1-A: `profiles` table — bridges auth to members + stores club role

```sql
create table profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  club_role text not null default 'member'
              check (club_role in ('admin', 'member')),
  created_at timestamptz default now()
);

create index profiles_member_id_idx on profiles (member_id);

-- Auto-create a profile row on every new signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### 1-B: Extend `meeting_roles` and `meetings`

```sql
-- Admin must explicitly "open" a role slot before members can claim it
alter table meeting_roles
  add column if not exists signup_open boolean not null default false;

-- Toastmaster sets this
alter table meetings
  add column if not exists theme_question text;
```

### 1-C: Extend `speeches`

```sql
-- Speaker submits their speech plan; visible to their evaluator
alter table speeches
  add column if not exists speech_plan text;
```

### 1-D: Seed your first admin (run once after your account exists)

```sql
update profiles
set club_role = 'admin',
    member_id = (select id from members where email = 'your@email.com' limit 1)
where id = (select id from auth.users where email = 'your@email.com' limit 1);
```

---

## Phase 2 — Helper DB Functions

```sql
create or replace function get_my_club_role()
returns text language sql security definer stable as $$
  select club_role from profiles where id = auth.uid();
$$;

create or replace function get_my_member_id()
returns uuid language sql security definer stable as $$
  select member_id from profiles where id = auth.uid();
$$;

create or replace function i_hold_meeting_role(p_meeting_id uuid, p_role_name text)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from meeting_roles mr
    join roles r on r.id = mr.role_id
    where mr.meeting_id = p_meeting_id
      and mr.member_id = get_my_member_id()
      and r.name = p_role_name
  );
$$;
```

---

## Phase 3 — Race-Condition-Safe Role Claim Function

A plain `UPDATE WHERE member_id IS NULL` from the client is **not atomic** — two users can both read "unclaimed" and both succeed. The fix is a DB-level lock:

```sql
create or replace function claim_meeting_role(p_meeting_role_id uuid)
returns meeting_roles language plpgsql security definer as $$
declare
  v_member_id uuid;
  v_result    meeting_roles;
begin
  v_member_id := get_my_member_id();
  if v_member_id is null then
    raise exception 'No member profile linked to this account';
  end if;

  -- Lock the row; skip if someone else is claiming simultaneously
  select * into v_result
  from meeting_roles
  where id = p_meeting_role_id
    and member_id is null
    and signup_open = true
  for update skip locked;

  if not found then
    raise exception 'Role is no longer available';
  end if;

  update meeting_roles
  set member_id = v_member_id, status = 'assigned'
  where id = p_meeting_role_id
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function unclaim_meeting_role(p_meeting_role_id uuid)
returns void language plpgsql security definer as $$
begin
  update meeting_roles
  set member_id = null, status = 'unassigned'
  where id = p_meeting_role_id
    and member_id = get_my_member_id();

  if not found then
    raise exception 'Cannot unclaim: role not held by you';
  end if;
end;
$$;
```

Frontend calls via RPC — no direct UPDATE from the client:

```typescript
supabase.rpc('claim_meeting_role', { p_meeting_role_id: id })
supabase.rpc('unclaim_meeting_role', { p_meeting_role_id: id })
```

---

## Phase 4 — RLS Policies (run LAST — after frontend is updated)

> **Important:** Tighten RLS only after the frontend changes are deployed. Doing it early locks you out of testing.

Drop all existing `using(true)` policies, then apply the following.

### Enable RLS

```sql
alter table profiles           enable row level security;
alter table members            enable row level security;
alter table meetings           enable row level security;
alter table meeting_roles      enable row level security;
alter table speeches           enable row level security;
alter table grammarian_reports enable row level security;
alter table ah_counter_reports enable row level security;
alter table evaluator_reports  enable row level security;
alter table timer_reports      enable row level security;
alter table votes              enable row level security;
alter table speech_comments    enable row level security;
```

### `profiles`

```sql
create policy "profiles: own row read"
  on profiles for select using (id = auth.uid());

create policy "profiles: admin read all"
  on profiles for select using (get_my_club_role() = 'admin');

create policy "profiles: own row update"
  on profiles for update using (id = auth.uid());
```

### `members`

```sql
create policy "members: authenticated read"
  on members for select using (auth.role() = 'authenticated');

create policy "members: admin insert"
  on members for insert with check (get_my_club_role() = 'admin');

create policy "members: admin update"
  on members for update using (get_my_club_role() = 'admin');

create policy "members: admin delete"
  on members for delete using (get_my_club_role() = 'admin');
```

### `meetings`

```sql
create policy "meetings: authenticated read"
  on meetings for select using (auth.role() = 'authenticated');

create policy "meetings: admin insert"
  on meetings for insert with check (get_my_club_role() = 'admin');

create policy "meetings: admin update"
  on meetings for update using (get_my_club_role() = 'admin');

create policy "meetings: toastmaster update theme"
  on meetings for update
  using (i_hold_meeting_role(id, 'Toastmaster'))
  with check (i_hold_meeting_role(id, 'Toastmaster'));
```

### `meeting_roles`

```sql
create policy "meeting_roles: admin full access"
  on meeting_roles for all using (get_my_club_role() = 'admin');

create policy "meeting_roles: member read open or own"
  on meeting_roles for select
  using (signup_open = true or member_id = get_my_member_id());
```

> Members claim roles via the `claim_meeting_role` RPC (security definer) — no direct INSERT/UPDATE policy needed for members.

### `speeches`

```sql
create policy "speeches: authenticated read"
  on speeches for select using (auth.role() = 'authenticated');

create policy "speeches: admin full access"
  on speeches for all using (get_my_club_role() = 'admin');

create policy "speeches: speaker insert own"
  on speeches for insert
  with check (
    i_hold_meeting_role(meeting_id, 'Speaker')
    and speaker_id = get_my_member_id()
  );

create policy "speeches: speaker update own"
  on speeches for update
  using (speaker_id = get_my_member_id())
  with check (speaker_id = get_my_member_id());
```

### `grammarian_reports`

```sql
create policy "grammarian_reports: authenticated read"
  on grammarian_reports for select using (auth.role() = 'authenticated');

create policy "grammarian_reports: admin full access"
  on grammarian_reports for all using (get_my_club_role() = 'admin');

create policy "grammarian_reports: grammarian insert own"
  on grammarian_reports for insert
  with check (
    member_id = get_my_member_id()
    and i_hold_meeting_role(meeting_id, 'Grammarian')
  );

create policy "grammarian_reports: grammarian update own"
  on grammarian_reports for update
  using (member_id = get_my_member_id());
```

### `ah_counter_reports`

```sql
create policy "ah_counter_reports: authenticated read"
  on ah_counter_reports for select using (auth.role() = 'authenticated');

create policy "ah_counter_reports: admin full access"
  on ah_counter_reports for all using (get_my_club_role() = 'admin');

create policy "ah_counter_reports: ah_counter insert own"
  on ah_counter_reports for insert
  with check (
    i_hold_meeting_role(meeting_id, 'Ah-Counter')
    and exists (
      select 1 from meeting_roles
      where id = meeting_role_id and member_id = get_my_member_id()
    )
  );

create policy "ah_counter_reports: ah_counter update own"
  on ah_counter_reports for update
  using (
    exists (
      select 1 from meeting_roles
      where id = meeting_role_id and member_id = get_my_member_id()
    )
  );
```

### `evaluator_reports`

```sql
create policy "evaluator_reports: authenticated read"
  on evaluator_reports for select using (auth.role() = 'authenticated');

create policy "evaluator_reports: admin full access"
  on evaluator_reports for all using (get_my_club_role() = 'admin');

create policy "evaluator_reports: evaluator insert own"
  on evaluator_reports for insert
  with check (
    member_id = get_my_member_id()
    and exists (
      select 1 from meeting_roles
      where id = meeting_role_id and member_id = get_my_member_id()
    )
  );

create policy "evaluator_reports: evaluator update own"
  on evaluator_reports for update
  using (member_id = get_my_member_id());
```

### `timer_reports`

```sql
create policy "timer_reports: authenticated read"
  on timer_reports for select using (auth.role() = 'authenticated');

create policy "timer_reports: admin full access"
  on timer_reports for all using (get_my_club_role() = 'admin');

create policy "timer_reports: timer insert own"
  on timer_reports for insert
  with check (
    member_id = get_my_member_id()
    and i_hold_meeting_role(meeting_id, 'Timer')
  );

create policy "timer_reports: timer update own"
  on timer_reports for update
  using (member_id = get_my_member_id());
```

### `votes`

```sql
create policy "votes: authenticated read"
  on votes for select using (auth.role() = 'authenticated');

create policy "votes: member vote as self"
  on votes for insert with check (voter_id = get_my_member_id());

create policy "votes: member update own vote"
  on votes for update using (voter_id = get_my_member_id());

create policy "votes: admin full access"
  on votes for all using (get_my_club_role() = 'admin');
```

### `speech_comments`

```sql
create policy "speech_comments: authenticated read"
  on speech_comments for select using (auth.role() = 'authenticated');

create policy "speech_comments: member insert as self"
  on speech_comments for insert
  with check (commenter_id = get_my_member_id());

create policy "speech_comments: own comment delete"
  on speech_comments for delete
  using (commenter_id = get_my_member_id());

create policy "speech_comments: admin full access"
  on speech_comments for all using (get_my_club_role() = 'admin');
```

---

## Phase 5 — Frontend: Auth & Profile Layer

### Modify `src/app/AuthContext.ts`

Add to context type:

```typescript
import type { Profile } from "../types/database";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;     // NEW
  memberId: string | null;     // NEW — shortcut: profile?.member_id
  isAdmin: boolean;            // NEW — profile?.club_role === 'admin'
}
```

### Modify `src/app/AuthProvider.tsx`

After resolving the auth session, fetch the profiles row and expose it. Keep `loading = true` until both auth AND profile resolve:

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.user.id)
  .single();

// Expose in context: profile, memberId: profile?.member_id ?? null, isAdmin: profile?.club_role === 'admin'
```

### Extend `src/types/database.ts`

```typescript
export interface Profile {
  id: string;
  member_id: string | null;
  club_role: 'admin' | 'member';
  created_at: string;
}

// Also extend existing types:
// Meeting: add theme_question: string | null
// Speech: add speech_plan: string | null
```

### New file `src/hooks/useProfile.ts`

```typescript
export function useProfile() {
  const { profile, memberId, isAdmin } = useAuth();
  return {
    profile,
    memberId,
    isAdmin,
    isLinked: memberId !== null,
  };
}
```

---

## Phase 6 — Route Protection

### Modify `src/App.tsx`

Add two new route guards:

```typescript
function LinkedRoute({ children }) {
  // Redirects to /link-profile if authenticated but not linked to a member
  const { isLinked, loading } = useProfile();
  if (loading) return <AppLoadingScreen />;
  if (!isLinked) return <Navigate to="/link-profile" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }) {
  const { isAdmin } = useProfile();
  if (!isAdmin) return <AccessDenied />;
  return <>{children}</>;
}
```

New routes:

```typescript
<Route path="/link-profile" element={<ProtectedRoute><LinkProfile /></ProtectedRoute>} />
<Route path="/role-signup"  element={<ProtectedRoute><LinkedRoute><RoleSignup /></LinkedRoute></ProtectedRoute>} />
<Route path="/my-role/:meetingId" element={<ProtectedRoute><LinkedRoute><MyRoleDashboard /></LinkedRoute></ProtectedRoute>} />
```

---

## Phase 7 — New Pages & Component Changes

### New: `src/pages/LinkProfile.tsx`

Onboarding gate shown when `isLinked === false`. User picks themselves from the members list → updates `profiles.member_id` → redirects to `/`. Every new signup lands here first.

### New: `src/pages/RoleSignup.tsx`

Simple, dedicated self-signup page for members:

- Takes `?meetingId=` from query params (defaults to next upcoming meeting)
- Queries `meeting_roles` where `signup_open = true` (RLS automatically filters to open slots)
- Each role shown as a card: role name, `Open` badge or member name if claimed
- "Sign Up" button — disabled + greyed out if already claimed
- On click → `supabase.rpc('claim_meeting_role', { p_meeting_role_id })` with toast on "Role no longer available" error
- "Withdraw" → `supabase.rpc('unclaim_meeting_role', ...)`
- `refetchInterval: 10_000` so slots update live as others claim them

### New: `src/pages/MyRoleDashboard.tsx`

Route `/my-role/:meetingId` — shows only the action panel for the member's assigned role:

| Role | Actions available |
|---|---|
| Ah-Counter | Per-speaker filler count form |
| Grammarian | Grammar errors, notable phrases, score |
| Timer | Per-speech timing form |
| Evaluator | Assigned speech details + quality score, strengths, improvement notes |
| Speaker | Edit speech title + speech plan (visible to their evaluator) |
| Toastmaster | Set meeting theme + theme question |
| General Evaluator | Overall meeting score + notes |

All other meeting data shown as read-only.

### Modify: `src/pages/Meetings.tsx`

```typescript
const { isAdmin } = useProfile();

// Wrap these with {isAdmin && ...}:
// - "Add Meeting" button
// - Edit action in table rows
// - "Mark Done" / status change actions
```

### Modify: `src/pages/MeetingDetail.tsx`

```typescript
const { isAdmin, memberId } = useProfile();

// Admin: renders existing <RoleAssignment /> unchanged
// Non-admin: renders read-only roles panel + link to /my-role/:id if they hold a role

// Pass memberId to child components:
<VotingSection currentMemberId={memberId} ... />
<SpeechComments currentMemberId={memberId} ... />
```

### Modify: `src/pages/Members.tsx` and `src/pages/MemberDetail.tsx`

Wrap all add/edit/delete controls with `{isAdmin && ...}`. Member list remains visible to all.

### Modify: `src/components/meetings/VotingSection.tsx`

- Accept `currentMemberId?: string | null` prop
- If present: pre-fill voter as current user, hide the "who is voting" dropdown
- Admin view unchanged (full dropdown)

### Modify: `src/components/meetings/SpeechComments.tsx`

- Accept `currentMemberId?: string | null` prop
- If present: submit comment as current user, hide the commenter dropdown
- Admin view unchanged

### Modify: `src/components/meetings/RoleAssignment.tsx`

Add an "Open for Signup" toggle per role row:

```typescript
// Toggle that sets signup_open = true/false for a role slot
// Calls useUpsertMeetingRole with signup_open field added
```

This component stays **admin-only** — it is the management view.

### Modify: `src/components/ui/AppShell.tsx`

- Non-admin nav: Home, Meetings (read-only), My Role, Analytics
- Admin nav: all existing items unchanged
- Add sign-out button
- Add "My Role" link → `/role-signup` or `/my-role/:nextMeetingId`

---

## Phase 8 — New Hooks in `src/hooks/useRoles.ts`

```typescript
// Race-condition-safe claim via RPC
export function useClaimMeetingRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (meetingRoleId: string) => {
      const { data, error } = await supabase
        .rpc('claim_meeting_role', { p_meeting_role_id: meetingRoleId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting_roles'] });
    },
  });
}

export function useUnclaimMeetingRole() { /* mirrors above, calls unclaim_meeting_role */ }

// Current user's role assignment for a specific meeting
export function useMyMeetingRole(meetingId: string, memberId: string | null) {
  return useQuery({
    queryKey: ['my_meeting_role', meetingId, memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_roles')
        .select('*, roles(name)')
        .eq('meeting_id', meetingId)
        .eq('member_id', memberId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId && !!memberId,
  });
}

// Open role slots for signup page (live polling)
export function useOpenMeetingRoles(meetingId: string) {
  return useQuery({
    queryKey: ['open_meeting_roles', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_roles')
        .select('*, roles(name), members(name)')
        .eq('meeting_id', meetingId);
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
    refetchInterval: 10_000,
  });
}
```

---

## Phase 9 — Role Signup Enforcement (Banner)

In the home dashboard or `AppShell`, query the next upcoming meeting and check if `memberId` appears in `meeting_roles` for that meeting. If not, show a banner:

> "You haven't signed up for a role in the next meeting — Sign Up Now →"

---

## Implementation Order

| Step | What | Why this order |
|---|---|---|
| 1 | Run Migrations 1-A, 1-B, 1-C | Foundation — everything depends on this |
| 2 | Deploy helper DB functions | RLS policies call these |
| 3 | Deploy claim/unclaim DB functions | Signup page needs these |
| 4 | Extend TypeScript types | No runtime impact, unblocks type-safe code |
| 5 | Extend AuthContext + AuthProvider | Provides profile data to all components |
| 6 | Add `useProfile` hook | Components can read isAdmin/memberId |
| 7 | Create `LinkProfile` page + update `App.tsx` routes | Onboarding gate before anything else |
| 8 | Create `RoleSignup` + `MyRoleDashboard` pages | New routes, nothing existing changes |
| 9 | Update `Meetings.tsx` | Guard write actions |
| 10 | Update `MeetingDetail.tsx` | Conditional admin/member views |
| 11 | Update `Members.tsx` / `MemberDetail.tsx` | Guard write actions |
| 12 | Update `VotingSection` + `SpeechComments` | Pass memberId identity |
| 13 | Update `AppShell.tsx` | Context-aware navigation |
| 14 | Add new hooks to `useRoles.ts` | Signup page now functional |
| 15 | Add `signup_open` toggle to `RoleAssignment.tsx` | Admin can open slots |
| 16 | Run Migration 1-D (seed first admin) | You need admin access before RLS locks things |
| **17** | **Deploy RLS policies (Phase 4)** | **Always last — frontend must be correct first** |

---

## Key Architectural Decisions

**`profiles` table separate from `members`**
Members can exist in the DB before they have an auth account (historical tracking). Adding `user_id` to members would require null-handling in every existing query. The join table is additive and mirrors Supabase's own recommended pattern.

**DB function for role claiming (`FOR UPDATE SKIP LOCKED`)**
Client-side `UPDATE WHERE member_id IS NULL` is not atomic — two concurrent requests can both read "unclaimed" and both succeed. The Postgres advisory lock pattern inside a `security definer` function is the only correct solution for this race condition.

**RLS deployed last**
The frontend must use `memberId` as the voter/commenter identity *before* the DB enforces it. Deploying RLS early would immediately break voting and comments for all non-admin users.

**`refetchInterval` over Realtime subscriptions on signup page**
Supabase Realtime works but adds WebSocket connection management complexity. For a low-volume Toastmasters club, 10-second polling on the signup page is sufficient and has zero additional infrastructure cost.

**`signup_open` flag controlled by admin**
Roles don't automatically become open for signup. The admin (or Toastmaster) must explicitly open each slot. This prevents premature signups before the meeting agenda is finalized.
