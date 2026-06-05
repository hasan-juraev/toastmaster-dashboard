# Backend Fix Implementation Plan

Generated: 2026-06-05  
Branch: `feat/2026-05029-responsive-pwa`  
Scope: All issues found in backend analysis — performance, query optimisation, atomicity, cache correctness, real-time gaps.

---

## How to use this document

Work phase by phase, top to bottom. Each fix has:
- **Problem** — what is wrong and why it matters
- **Before → After** — concrete measurable difference
- **SQL / Code** — exact implementation to copy in
- **Checklist** — tick off as you go

Fixes within a phase are independent of each other unless marked `depends on`.

---

## Phase 1 — Critical (do first, data-safety issues)

---

### Fix 1 — `useDeleteMember`: replace 11 HTTP requests with one atomic RPC

**Problem**  
`useDeleteMember` fires 9 parallel UPDATE requests, then 1 DELETE for votes, then 1 DELETE for the member — 11 separate HTTP round trips. If the member DELETE fails after the nullifications succeed, the database is left in a corrupt half-deleted state. All of this should be one SQL transaction.

**Effort:** ~1 hour

**Before → After**

| | Before | After |
|---|---|---|
| Network requests | 11 HTTP calls (9 UPDATEs + DELETE votes + DELETE member) | 1 RPC call |
| Atomicity | If member DELETE fails after 9 UPDATEs succeed, DB is corrupted — member references nulled but member still exists | Single transaction — all or nothing, no partial state possible |
| Time on slow connection (200ms RTT) | 9 parallel + 200ms + 200ms = ~600ms minimum | ~200ms |
| Cache cleared on success | Only `["members"]` | `["members"]`, `["meeting_roles"]`, `["votes"]`, `["analytics"]` |
| Stale data after delete | Meeting Detail still shows deleted member name until manual refresh | All affected caches cleared immediately |

---

#### Step 1 — New migration

Create `supabase/migrations/20260605_delete_member_rpc.sql`:

```sql
-- Atomically nullify all FK references to a member, delete their votes,
-- then delete the member row. Runs inside a single transaction.
create or replace function delete_member(p_member_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Verify caller is admin
  if get_my_club_role() <> 'admin' then
    raise exception 'Only admins can delete members';
  end if;

  -- Nullify all nullable FK references (preserves historical records)
  update meeting_roles      set member_id    = null where member_id    = p_member_id;
  update speeches           set speaker_id   = null where speaker_id   = p_member_id;
  update speeches           set evaluator_id = null where evaluator_id = p_member_id;
  update grammarian_reports set member_id    = null where member_id    = p_member_id;
  update ah_counter_reports set speaker_id   = null where speaker_id   = p_member_id;
  update evaluator_reports  set member_id    = null where member_id    = p_member_id;
  update timer_reports      set member_id    = null where member_id    = p_member_id;
  update speech_comments    set commenter_id = null where commenter_id = p_member_id;
  update profiles           set member_id    = null where member_id    = p_member_id;

  -- votes.voter_id is non-nullable — delete those rows entirely
  delete from votes
  where voter_id = p_member_id or voted_for_member_id = p_member_id;

  -- Delete the member
  delete from members where id = p_member_id;

  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;
```

#### Step 2 — Update `useDeleteMember` in `src/hooks/useMembers.ts`

Replace the entire `mutationFn` body:

```ts
mutationFn: async (id: string) => {
  const { error } = await supabase.rpc("delete_member", { p_member_id: id });
  if (error) throw error;
},
```

#### Step 3 — Fix incomplete `onSuccess` cache invalidation

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["members"] });
  queryClient.invalidateQueries({ queryKey: ["meeting_roles"] });
  queryClient.invalidateQueries({ queryKey: ["votes"] });
  queryClient.invalidateQueries({ queryKey: ["analytics"] });
},
```

#### Checklist
- [ ] Create `supabase/migrations/20260605_delete_member_rpc.sql`
- [ ] Apply migration in Supabase SQL Editor
- [ ] Replace `mutationFn` body in `useMembers.ts`
- [ ] Update `onSuccess` to invalidate all affected query keys
- [ ] Test: delete a member, verify meeting roles and votes are cleaned up, no DB errors

---

## Phase 2 — High (login performance & cache waste)

---

### Fix 2 — `AuthProvider`: collapse 4 sequential round trips into 1 RPC

**Problem**  
On every login the app makes up to 4 sequential database calls:
1. `fetchProfile` → `SELECT * FROM profiles WHERE id = auth.uid()`
2. `autoLinkByEmail` step 1 → `SELECT id FROM members WHERE email ILIKE ?`
3. `autoLinkByEmail` step 2 → `UPDATE profiles SET member_id = ?`

Each call waits for the previous to finish. This is the primary reason the app shows a blank loading screen for 400–900ms on every page load.

**Effort:** ~1.5 hours  
**Depends on:** Fix 3 (email index should be created first)

**Before → After**

| | Before | After |
|---|---|---|
| DB calls on login | 4 sequential (session → fetchProfile → member lookup → update profile) | 1 RPC (`get_or_link_profile`) |
| Time to first render — cloud Supabase (150ms RTT) | ~450–600ms blocked waiting for sequential DB calls | ~150ms (1 round trip) |
| Time to first render — self-hosted (1ms RTT) | ~4ms sequential | ~1ms |
| Unlinked user on first login | Waterfall: wait for profile, wait for member lookup, wait for update | Single server-side join + update in one call |
| Code complexity | 3 functions (`withTimeout`, `fetchProfile`, `autoLinkByEmail`) + 30 lines of orchestration | 1 function (`loadProfile`) + 1 RPC call |

---

#### Step 1 — New migration

Create `supabase/migrations/20260605_get_or_link_profile_rpc.sql`:

```sql
-- Add case-insensitive index on members.email for fast email matching
create index if not exists members_email_lower_idx on members (lower(email));

-- Single RPC: fetch profile, auto-link by email if unlinked, return result.
-- Replaces 3 sequential client-side calls with 1 server-side transaction.
create or replace function get_or_link_profile(p_user_id uuid, p_email text)
returns setof profiles language plpgsql security definer as $$
declare
  v_profile profiles;
begin
  select * into v_profile from profiles where id = p_user_id;

  -- Profile not found (shouldn't happen — trigger creates it on signup)
  if not found then
    return;
  end if;

  -- Already linked — return immediately
  if v_profile.member_id is not null then
    return next v_profile;
    return;
  end if;

  -- Try to auto-link by email (case-insensitive)
  if p_email is not null then
    update profiles p
    set member_id = m.id
    from members m
    where p.id = p_user_id
      and lower(m.email) = lower(p_email)
      and m.email is not null
    returning p.* into v_profile;
  end if;

  return next v_profile;
end;
$$;
```

#### Step 2 — Rewrite `AuthProvider.tsx`

Remove `fetchProfile`, `autoLinkByEmail`, and `withTimeout` helper. Replace with a single RPC call:

```ts
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./AuthContext";
import type { Profile } from "../types/database";

async function loadProfile(userId: string, email: string | undefined): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .rpc("get_or_link_profile", {
        p_user_id: userId,
        p_email: email ?? null,
      })
      .maybeSingle();
    if (error) throw error;
    return (data as Profile | null) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfile(await loadProfile(session.user.id, session.user.email));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setProfile(await loadProfile(session.user.id, session.user.email));
        } else {
          setProfile(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const memberId = profile?.member_id ?? null;
  const isAdmin = profile?.club_role === "admin";

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, memberId, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Note:** `withTimeout` is removed. `getSession()` reads from localStorage and returns synchronously — it does not hit the network. The `loadProfile` RPC is the only network call, and the Supabase client already handles connection timeouts via the fetch API.

#### Checklist
- [ ] Create `supabase/migrations/20260605_get_or_link_profile_rpc.sql`
- [ ] Apply migration in Supabase SQL Editor
- [ ] Rewrite `src/app/AuthProvider.tsx` (remove `fetchProfile`, `autoLinkByEmail`, `withTimeout`)
- [ ] Test: log out, log in — verify profile loads and member is auto-linked by email
- [ ] Test: new user with no matching email — verify profile loads with `member_id: null`
- [ ] Test: `getSession()` with no session → loading resolves immediately, no crash

---

### Fix 3 — Missing index on `members.email`

**Problem**  
`autoLinkByEmail` (and the new RPC) matches on `lower(email)`. Without a functional index, PostgreSQL does a full sequential scan of the members table on every login of an unlinked account.

**Effort:** 5 minutes  
**Note:** This index is already included in the Fix 2 migration (`members_email_lower_idx`). Only create a standalone migration if skipping Fix 2.

**Before → After**

| | Before | After |
|---|---|---|
| Query type on `members.email` | Sequential scan — reads every row | Index scan on `lower(email)` — reads 1 entry |
| Cost at 50 members | Scans 50 rows per login | Reads 1 index entry |
| Cost at 500 members | Scans 500 rows per login | Still reads 1 index entry |
| Scales with club size | Linearly slower | Constant time regardless of member count |

---

#### Standalone migration (only if skipping Fix 2)

Create `supabase/migrations/20260605_members_email_index.sql`:

```sql
create index if not exists members_email_lower_idx on members (lower(email));
```

#### Checklist
- [ ] Confirm index is created (either via Fix 2 migration or standalone)
- [ ] Verify in Supabase dashboard: Table Editor → members → Indexes

---

### Fix 4 — `useMeetingRoleReports`: split monolithic cache key into per-type keys

**Problem**  
All 4 report types share cache key `["role_reports", meetingId]`. Any mutation (e.g. timer submits their report) invalidates the shared key, triggering a refetch of all 4 report types even though 3 of them didn't change.

**Effort:** ~30 minutes

**Before → After**

| | Before | After |
|---|---|---|
| Cache key | `["role_reports", meetingId]` — one key for all 4 types | `["role_reports", "timer", meetingId]` etc. — 4 independent keys |
| Refetches when Timer saves | All 4 report types refetch (4 HTTP calls) | Only timer reports refetch (1 HTTP call) |
| Refetches when all 4 roles save simultaneously during a live meeting | 4 saves × 4 refetches = **16 HTTP calls** | 4 saves × 1 refetch = **4 HTTP calls** |
| Wasted bytes transferred | 3 of every 4 responses contain data that didn't change | 0 unnecessary responses |

---

#### Changes to `src/hooks/useRoleReports.ts`

**1. Split the read query into 4 separate hooks:**

```ts
export function useAhCounterReports(meetingId: string) {
  return useQuery<AhCounterReport[]>({
    queryKey: ["role_reports", "ah_counter", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ah_counter_reports").select("*").eq("meeting_id", meetingId);
      if (error) throw error;
      return (data ?? []) as AhCounterReport[];
    },
    enabled: !!meetingId,
  });
}

export function useGrammarianReports(meetingId: string) {
  return useQuery<GrammarianReport[]>({
    queryKey: ["role_reports", "grammarian", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grammarian_reports").select("*").eq("meeting_id", meetingId);
      if (error) throw error;
      return (data ?? []) as GrammarianReport[];
    },
    enabled: !!meetingId,
  });
}

export function useEvaluatorReports(meetingId: string) {
  return useQuery<EvaluatorReport[]>({
    queryKey: ["role_reports", "evaluator", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluator_reports").select("*").eq("meeting_id", meetingId);
      if (error) throw error;
      return (data ?? []) as EvaluatorReport[];
    },
    enabled: !!meetingId,
  });
}

export function useTimerReports(meetingId: string) {
  return useQuery<TimerReport[]>({
    queryKey: ["role_reports", "timer", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timer_reports").select("*").eq("meeting_id", meetingId);
      if (error) throw error;
      return (data ?? []) as TimerReport[];
    },
    enabled: !!meetingId,
  });
}

// Convenience wrapper — same API as before, composes the 4 hooks
// No page-level changes needed
export function useMeetingRoleReports(meetingId: string) {
  const ahCounter  = useAhCounterReports(meetingId);
  const grammarian = useGrammarianReports(meetingId);
  const evaluator  = useEvaluatorReports(meetingId);
  const timer      = useTimerReports(meetingId);

  return {
    data: {
      ahCounterReports:  ahCounter.data  ?? [],
      grammarianReports: grammarian.data ?? [],
      evaluatorReports:  evaluator.data  ?? [],
      timerReports:      timer.data      ?? [],
    },
    isLoading: ahCounter.isLoading || grammarian.isLoading || evaluator.isLoading || timer.isLoading,
    error: ahCounter.error ?? grammarian.error ?? evaluator.error ?? timer.error,
  };
}
```

**2. Update `invalidateRoleReportQueries` to accept a report type:**

```ts
type ReportType = "ah_counter" | "grammarian" | "evaluator" | "timer";

function invalidateReportQuery(
  queryClient: ReturnType<typeof useQueryClient>,
  type: ReportType,
  meetingId: string,
) {
  queryClient.invalidateQueries({ queryKey: ["role_reports", type, meetingId] });
  queryClient.invalidateQueries({ queryKey: ["analytics"] });
}
```

**3. Update each mutation's `onSuccess`:**

```ts
// useUpsertGrammarianReport
onSuccess: (_data, variables) => {
  if (variables.meeting_id) invalidateReportQuery(queryClient, "grammarian", variables.meeting_id);
},

// useUpsertAhCounterReport
onSuccess: (_data, variables) => {
  if (variables.meeting_id) invalidateReportQuery(queryClient, "ah_counter", variables.meeting_id);
},

// useUpsertEvaluatorReport
onSuccess: (_data, variables) => {
  if (variables.meeting_id) invalidateReportQuery(queryClient, "evaluator", variables.meeting_id);
},

// useUpsertTimerReport
onSuccess: (_data, variables) => {
  if (variables.meeting_id) invalidateReportQuery(queryClient, "timer", variables.meeting_id);
},
```

#### Checklist
- [ ] Add 4 individual query hooks to `useRoleReports.ts`
- [ ] Rewrite `useMeetingRoleReports` as a composition wrapper
- [ ] Add `ReportType` type and update `invalidateReportQuery`
- [ ] Update `onSuccess` in all 4 upsert mutations to pass report type
- [ ] Verify no TypeScript errors (`npx tsc --noEmit`)
- [ ] Test: submit a timer report, confirm only timer cache invalidates (Network tab)

---

### Fix 5 — `useClaimMeetingRole` / `useUnclaimMeetingRole`: scope cache invalidation to meetingId

**Problem**  
Both mutations invalidate all cached `meeting_roles`, `open_meeting_roles`, and `my_meeting_role` entries regardless of which meeting was affected. If 10 meetings are cached, claiming a role in one triggers 30 unnecessary refetches.

`claim_meeting_role` already returns the full `meeting_roles` row including `meeting_id` — the data to scope the invalidation is already there, just unused.

**Effort:** ~20 minutes

**Before → After**

| | Before | After |
|---|---|---|
| `invalidateQueries` scope | Matches all entries for all meetings | Matches only the specific `meetingId` |
| Refetches per claim (10 meetings cached) | 10 + 10 + 10 = **30 HTTP calls** | 1 + 1 + 1 = **3 HTTP calls** |
| Refetches per unclaim | Same — **30 calls** | **3 calls** |
| Wasted requests saved per role claim event | 27 | — |

---

#### Changes to `src/hooks/useRoles.ts`

**`useClaimMeetingRole`:**

```ts
export function useClaimMeetingRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (meetingRoleId: string) => {
      const { data, error } = await supabase
        .rpc("claim_meeting_role", { p_meeting_role_id: meetingRoleId });
      if (error) throw error;
      return data as MeetingRole;
    },
    onSuccess: (data) => {
      const mid = data?.meeting_id;
      if (mid) {
        queryClient.invalidateQueries({ queryKey: ["meeting_roles", mid] });
        queryClient.invalidateQueries({ queryKey: ["open_meeting_roles", mid] });
        queryClient.invalidateQueries({ queryKey: ["my_meeting_role", mid] });
      }
    },
  });
}
```

**`useUnclaimMeetingRole`** — add `meetingId` to the parameter:

```ts
export function useUnclaimMeetingRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingRoleId }: { meetingRoleId: string; meetingId: string }) => {
      const { error } = await supabase
        .rpc("unclaim_meeting_role", { p_meeting_role_id: meetingRoleId });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      const mid = variables.meetingId;
      queryClient.invalidateQueries({ queryKey: ["meeting_roles", mid] });
      queryClient.invalidateQueries({ queryKey: ["open_meeting_roles", mid] });
      queryClient.invalidateQueries({ queryKey: ["my_meeting_role", mid] });
    },
  });
}
```

**Update call sites** — search for `unclaimMeetingRole.mutate(` and `unclaimMeetingRole.mutateAsync(` and pass `{ meetingRoleId, meetingId }` instead of a bare string.

#### Checklist
- [ ] Update `useClaimMeetingRole.onSuccess` to use `data.meeting_id`
- [ ] Update `useUnclaimMeetingRole` to accept `{ meetingRoleId, meetingId }`
- [ ] Find and update all `unclaimMeetingRole.mutate(...)` call sites
- [ ] Verify no TypeScript errors
- [ ] Test: claim a role, Network tab — confirm only 3 targeted refetches, not 30

---

## Phase 3 — Medium (UX correctness & code quality)

---

### Fix 6 — `useSpeechComments`: add Realtime subscription

**Problem**  
Comments are collaborative — multiple members comment on the same speech. Without a Realtime subscription, a user must manually refresh to see new comments from others. The global `staleTime: 5min` makes this worse.

**Effort:** ~20 minutes

**Before → After**

| | Before | After |
|---|---|---|
| User A posts a comment | User B sees it only after manual page reload or 5-minute cache expiry | User B sees it within ~200ms via WebSocket push |
| Mechanism | Stale cache, no subscription | `postgres_changes` subscription filtered by `speech_id` |
| Extra network cost | None (but broken collaborative UX) | 1 persistent WebSocket, shared across all Realtime subscriptions in the app |

---

#### Changes to `src/hooks/useSpeechComments.ts`

```ts
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { SpeechComment } from "../types/database";

export function useSpeechComments(speechId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<SpeechComment[]>({
    queryKey: ["speech_comments", speechId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speech_comments")
        .select("*")
        .eq("speech_id", speechId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SpeechComment[];
    },
    enabled: !!speechId,
  });

  useEffect(() => {
    if (!speechId) return;

    const channel = supabase
      .channel(`speech_comments_${speechId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "speech_comments",
          filter: `speech_id=eq.${speechId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["speech_comments", speechId] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [speechId, queryClient]);

  return query;
}

// useCreateSpeechComment and useDeleteSpeechComment remain unchanged
```

#### Checklist
- [ ] Add `useEffect` import to `useSpeechComments.ts`
- [ ] Extract `useQuery` result into `query` variable
- [ ] Add `useEffect` with Realtime channel (same pattern as role signups)
- [ ] Return `query` at end of function
- [ ] Test: open a speech on two browser tabs, post a comment in one — verify it appears in the other without refresh

---

### Fix 7 — `useUpsertGrammarianReport` / `useUpsertEvaluatorReport`: replace insert/update branch with proper upsert

**Problem**  
These two mutations use a manual `if (report.id) ? update : insert` branch. If `insert` is attempted when a row with the same `meeting_role_id` already exists (e.g. user opens the form twice), the DB throws a unique constraint error instead of updating. `useUpsertAhCounterReport` and `useUpsertTimerReport` already use the correct `upsert` + `onConflict` pattern.

**Effort:** ~20 minutes

**Before → After**

| | Before | After |
|---|---|---|
| Submit report, close, reopen, submit again | Second submit hits `unique (meeting_role_id)` constraint → DB error thrown to user | Second submit silently updates the existing row |
| Code paths | 2 branches — insert vs update checked by `report.id` presence | 1 branch — `upsert` with `onConflict: "meeting_role_id"` |
| Simultaneous double-submit race condition | Both try to INSERT → one fails with constraint error | `upsert` is atomic — last write wins, no error |
| Consistency with `useUpsertAhCounterReport` / `useUpsertTimerReport` | Inconsistent | Consistent — all 4 report mutations use the same pattern |

---

#### Changes to `src/hooks/useRoleReports.ts`

**`useUpsertGrammarianReport`:**

```ts
export function useUpsertGrammarianReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      report: Omit<GrammarianReport, "id" | "created_at"> & { id?: string },
    ) => {
      const { data, error } = await supabase
        .from("grammarian_reports")
        .upsert(
          {
            ...(report.id ? { id: report.id } : {}),
            meeting_role_id: report.meeting_role_id,
            meeting_id:      report.meeting_id,
            member_id:       report.member_id,
            grammar_errors:  report.grammar_errors,
            notable_phrases: report.notable_phrases,
            score:           report.score,
            notes:           report.notes,
          },
          { onConflict: "meeting_role_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as GrammarianReport;
    },
    onSuccess: (_data, variables) => {
      if (variables.meeting_id) invalidateReportQuery(queryClient, "grammarian", variables.meeting_id);
    },
  });
}
```

**`useUpsertEvaluatorReport`:**

```ts
export function useUpsertEvaluatorReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      report: Omit<EvaluatorReport, "id" | "created_at"> & { id?: string },
    ) => {
      const { data, error } = await supabase
        .from("evaluator_reports")
        .upsert(
          {
            ...(report.id ? { id: report.id } : {}),
            meeting_role_id:   report.meeting_role_id,
            meeting_id:        report.meeting_id,
            member_id:         report.member_id,
            speech_id:         report.speech_id,
            quality_score:     report.quality_score,
            strengths:         report.strengths,
            improvement_notes: report.improvement_notes,
          },
          { onConflict: "meeting_role_id" },
        )
        .select()
        .single();

      if (error) throw error;
      return data as EvaluatorReport;
    },
    onSuccess: (_data, variables) => {
      if (variables.meeting_id) invalidateReportQuery(queryClient, "evaluator", variables.meeting_id);
    },
  });
}
```

#### Checklist
- [ ] Replace `useUpsertGrammarianReport.mutationFn` with upsert pattern
- [ ] Replace `useUpsertEvaluatorReport.mutationFn` with upsert pattern
- [ ] Verify DB has `unique (meeting_role_id)` on both tables (confirmed in `20260512_role_workflows.sql`)
- [ ] Test: submit grammarian report, re-submit — verify it updates, not errors

---

### Fix 8 — `useVoteResults`: O(n×m) linear scan → O(1) Map lookup

**Problem**  
`members.find(m => m.id === member_id)` is called once per unique voter per category — inside the tally loop. A `Map` built once before the loop gives O(1) lookups.

**Effort:** 5 minutes

**Before → After**

| | Before | After |
|---|---|---|
| Algorithm | `Array.find()` inside tally loop — O(categories × voters × members) | `Map.get()` — O(categories × voters) |
| Comparisons: 50 members, 20 voters, 3 categories | 3 × 20 × 50 = **3,000** string comparisons per render | 3 × 20 = **60** lookups per render |
| Comparisons: 100 members, 40 voters | 3 × 40 × 100 = **12,000** | **120** |
| Visible impact | Negligible on desktop, noticeable jank on older phones during voting | None |

---

#### Changes to `src/hooks/useVotes.ts`

```ts
export function useVoteResults(meetingId: string, members: { id: string; name: string }[]) {
  const { data: votes = [] } = useVotes(meetingId);

  // Build O(1) lookup once — not inside the per-category loop
  const memberNameMap = new Map(members.map((m) => [m.id, m.name]));

  const categories: VoteCategory[] = [
    "Best Speaker",
    "Best Table Topics Speaker",
    "Best Evaluator",
  ];

  const results: CategoryResult[] = categories.map((category) => {
    const categoryVotes = votes.filter((v) => v.category === category);

    const countMap = new Map<string, number>();
    for (const vote of categoryVotes) {
      if (!vote.voted_for_member_id) continue;
      countMap.set(
        vote.voted_for_member_id,
        (countMap.get(vote.voted_for_member_id) ?? 0) + 1,
      );
    }

    const tally: VoteTally[] = Array.from(countMap.entries())
      .map(([member_id, count]) => ({
        member_id,
        member_name: memberNameMap.get(member_id) ?? "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return { category, tally, winner: tally[0] ?? null };
  });

  return results;
}
```

#### Checklist
- [ ] Add `memberNameMap` before the `categories.map` loop
- [ ] Replace `members.find(...)` with `memberNameMap.get(member_id)`

---

## Phase 4 — Low (polish & minor cleanup)

---

### Fix 9 — `AuthProvider`: remove unnecessary `Promise.resolve()` wrapper

**Problem**  
`withTimeout(Promise.resolve(query), 4000)` wraps an already-thenable Supabase query builder in a redundant `Promise.resolve()`. Supabase query builders implement `.then()` — they are valid Promise arguments directly.

**Note:** Moot if Fix 2 is implemented (the entire `withTimeout`/`fetchProfile` block is deleted). Only apply if skipping Fix 2.

**Effort:** 2 minutes

**Before → After**

| | Before | After |
|---|---|---|
| Wrapper | `withTimeout(Promise.resolve(query), 4000)` | `withTimeout(query, 4000)` |
| Extra objects created | 1 intermediate `Promise` per profile fetch | 0 |

---

#### Change in `src/app/AuthProvider.tsx`

```ts
// Before
const { data } = await withTimeout(Promise.resolve(query), 4000);

// After
const { data } = await withTimeout(query, 4000);
```

#### Checklist
- [ ] Remove `Promise.resolve()` wrapper in `fetchProfile`
- [ ] (Skip entirely if Fix 2 is implemented)

---

### Fix 10 — Mutations: use `setQueryData` to avoid refetch round trips

**Problem**  
`useCreateMember`, `useUpdateMember`, `useCreateMeeting`, `useUpdateMeeting` call `invalidateQueries` after a successful write, triggering a full list refetch — even though the server already returned the exact created/updated record in the mutation response. The data is already in hand; `setQueryData` patches the cache in-place with no extra request.

**Effort:** ~30 minutes

**Before → After**

| | Before | After |
|---|---|---|
| Requests on member edit | Mutation write + full list GET refetch = **2 requests** | Mutation write only = **1 request** |
| UI update after save | Name updates after server refetch completes (~150ms later) | Name updates **instantly** (0ms — cache patched in place) |
| Requests on meeting create | Write + full list refetch = **2 requests** | **1 request** |
| Scales with usage | 1 extra request per save, every time the admin edits anything | 0 extra requests regardless of edit frequency |

---

#### Changes to `src/hooks/useMembers.ts`

```ts
// useCreateMember
onSuccess: (newMember) => {
  queryClient.setQueryData<Member[]>(["members"], (old = []) =>
    [...old, newMember].sort((a, b) => a.name.localeCompare(b.name)),
  );
},

// useUpdateMember
onSuccess: (updated) => {
  queryClient.setQueryData<Member[]>(["members"], (old = []) =>
    old.map((m) => (m.id === updated.id ? updated : m)),
  );
},
```

#### Changes to `src/hooks/useMeetings.ts`

```ts
// useCreateMeeting (list ordered date DESC)
onSuccess: (newMeeting) => {
  queryClient.setQueryData<Meeting[]>(["meetings"], (old = []) =>
    [newMeeting, ...old].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
  );
},

// useUpdateMeeting
onSuccess: (updated) => {
  queryClient.setQueryData<Meeting[]>(["meetings"], (old = []) =>
    old.map((m) => (m.id === updated.id ? updated : m)),
  );
},
```

**Note:** `useDeleteMember` and `useDeleteMeeting` should continue using `invalidateQueries` — removing an item from a sorted list has more edge cases and a refetch is the safe choice.

#### Checklist
- [ ] Update `useCreateMember.onSuccess` in `useMembers.ts`
- [ ] Update `useUpdateMember.onSuccess` in `useMembers.ts`
- [ ] Update `useCreateMeeting.onSuccess` in `useMeetings.ts`
- [ ] Update `useUpdateMeeting.onSuccess` in `useMeetings.ts`
- [ ] Test: edit a member name, confirm update is instant with no GET refetch in Network tab

---

## Overall session comparison

Scenario: admin logs in, opens a meeting, all 4 roles submit reports, members vote, admin edits a member.

| Metric | Before all fixes | After all fixes |
|---|---|---|
| DB calls on login | 4 sequential | 1 |
| Time to first render — cloud (150ms RTT) | ~450–600ms | ~150ms |
| Time to first render — self-hosted (1ms RTT) | ~4ms | ~1ms |
| Delete member requests | 11 | 1 |
| Delete member atomicity | ❌ can corrupt on partial failure | ✅ single transaction |
| Stale data after member delete | ❌ meeting roles still show old name | ✅ all caches cleared |
| Report saves during live meeting (4 roles) | 16 refetch requests | 4 refetch requests |
| Role claim refetches (10 meetings cached) | 30 | 3 |
| Member edit — UI update timing | ~150ms after server refetch | Instant (0ms) |
| Member edit — extra requests | 1 GET refetch per save | 0 |
| Speech comments live updates | ❌ manual refresh only | ✅ within ~200ms |
| Duplicate report submit | ❌ DB constraint error thrown to user | ✅ silently updates |
| Email lookup on login | Sequential scan (O(n) rows) | Index scan (O(1)) |
| Vote tally comparisons (50 members, 40 voters) | 12,000 per render | 120 per render |

---

## Migrations checklist (apply in order)

| File | Contents | Status |
|---|---|---|
| `20260604_performance_indexes_and_analytics_rpc.sql` | 12 indexes + `get_analytics()` RPC | ⬜ Apply |
| `20260605_delete_member_rpc.sql` | `delete_member()` RPC | ⬜ Create + Apply |
| `20260605_get_or_link_profile_rpc.sql` | `get_or_link_profile()` RPC + email index | ⬜ Create + Apply |

---

## Files changed summary

| File | Fixes |
|---|---|
| `supabase/migrations/20260605_delete_member_rpc.sql` | Fix 1 |
| `supabase/migrations/20260605_get_or_link_profile_rpc.sql` | Fix 2, Fix 3 |
| `src/app/AuthProvider.tsx` | Fix 2, Fix 9 |
| `src/hooks/useMembers.ts` | Fix 1, Fix 10 |
| `src/hooks/useMeetings.ts` | Fix 10 |
| `src/hooks/useRoleReports.ts` | Fix 4, Fix 7 |
| `src/hooks/useRoles.ts` | Fix 5 |
| `src/hooks/useSpeechComments.ts` | Fix 6 |
| `src/hooks/useVotes.ts` | Fix 8 |
| `src/hooks/useRoleSignups.ts` | *(already done — Realtime)* |

---

## Priority order if doing incrementally

```
Fix 3  (5 min)   — email index, zero risk, immediate DB gain
Fix 8  (5 min)   — O(1) Map lookup, pure JS, zero risk
Fix 9  (2 min)   — remove Promise.resolve wrapper (skip if doing Fix 2)
Fix 5  (20 min)  — scoped cache invalidation
Fix 6  (20 min)  — speech comments Realtime
Fix 4  (30 min)  — split report cache keys
Fix 7  (20 min)  — grammarian/evaluator upsert
Fix 10 (30 min)  — setQueryData in mutations
Fix 1  (60 min)  — delete_member RPC (needs migration + test)
Fix 2  (90 min)  — get_or_link_profile RPC (needs migration + test, depends on Fix 3)
```

---

## Estimated total effort

| Phase | Fixes | Time |
|---|---|---|
| Phase 1 — Critical | Fix 1 | 1 hour |
| Phase 2 — High | Fix 2, 3, 4, 5 | 2.5 hours |
| Phase 3 — Medium | Fix 6, 7, 8 | 45 minutes |
| Phase 4 — Low | Fix 9, 10 | 35 minutes |
| **Total** | **10 fixes** | **~5 hours** |
