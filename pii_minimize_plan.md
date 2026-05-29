# PII Minimization Implementation Plan
# Toastmasters Dashboard — Anonymous Auth + Passkey + Recovery

## Goal
Replace email/password auth with anonymous auth + passkeys so the app stores
zero personal information. Reduce Korean PIPA compliance burden to ~3–5%.

## Guiding Principle
Every step is independently deployable. Each phase leaves the app in a working
state. No big-bang migration.

---

## Overview of What Changes

| Area | Before | After |
|------|--------|-------|
| `src/pages/Login.tsx` | Email + password form | Passkey prompt |
| `src/pages/LinkProfile.tsx` | Dropdown to pick name | Removed |
| `src/pages/JoinClub.tsx` | Does not exist | Invite code + nickname + passkey enrollment |
| `src/pages/Recover.tsx` | Does not exist | Recovery token redemption |
| `members.email` column | Optional text | Dropped |
| `members.name` column | Real name | Renamed to `nickname` |
| Auth method | `signInWithPassword` | `signInAnonymously` → passkey upgrade |
| `invite_codes` table | Does not exist | New |
| `recovery_tokens` table | Does not exist | New |
| All other files | Unchanged | Unchanged |

---

## Phase 0 — Prerequisites (Do Before Any Code)

### 0.1 Enable Anonymous Auth in Supabase Dashboard
- Go to Supabase Dashboard → Authentication → Providers
- Enable **Anonymous sign-ins**
- This is required before `signInAnonymously()` will work

### 0.2 Enable WebAuthn / Passkey MFA in Supabase Dashboard
- Go to Authentication → Multi-Factor Authentication
- Enable **WebAuthn** as an MFA factor
- Note: as of 2026 this is available on Pro plan and above

### 0.3 Communicate to Existing Members
- Existing email/password accounts will be migrated in Phase 4
- Warn members before Phase 4 is deployed: "We are switching to Face ID / fingerprint login"
- Distribute recovery tokens at the next meeting (generated in Phase 3)

---

## Phase 1 — Database Migration (Schema Only, No Breaking Changes)

**File:** `supabase/migrations/20260529_pii_minimize.sql`

### 1.1 Add `invite_codes` Table

```sql
create table invite_codes (
  token       text primary key default encode(gen_random_bytes(8), 'hex'),
  member_id   uuid references members(id) on delete cascade,
  created_by  uuid references profiles(id) on delete set null,
  expires_at  timestamptz not null default now() + interval '48 hours',
  used_at     timestamptz,
  -- null member_id = new member (creates new members row on redemption)
  -- non-null member_id = recovery / re-link to existing member
  constraint invite_codes_single_use check (used_at is null or used_at is not null)
);

create index invite_codes_member_id_idx on invite_codes (member_id);
create index invite_codes_expires_at_idx on invite_codes (expires_at);
```

### 1.2 Add `recovery_tokens` Table

```sql
create table recovery_tokens (
  token      text primary key default encode(gen_random_bytes(16), 'hex'),
  member_id  uuid not null references members(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz
);

create index recovery_tokens_member_id_idx on recovery_tokens (member_id);
create index recovery_tokens_expires_at_idx on recovery_tokens (expires_at);
```

### 1.3 Add `nickname` Column to `members` (Non-Breaking — Additive)

```sql
-- Add nickname alongside existing name (both exist during transition)
alter table members add column if not exists nickname text;
```

Do NOT drop `email` or `name` yet — existing data and queries still reference them.

### 1.4 RLS for New Tables

```sql
-- invite_codes: admin can manage, no one else can read tokens directly
alter table invite_codes enable row level security;

create policy "invite_codes: admin full access"
  on invite_codes for all using (get_my_club_role() = 'admin');

-- recovery_tokens: admin can manage
alter table recovery_tokens enable row level security;

create policy "recovery_tokens: admin full access"
  on recovery_tokens for all using (get_my_club_role() = 'admin');
```

### 1.5 DB Functions for Safe Redemption

```sql
-- Redeem invite code: validates token, creates/links member, returns member_id
create or replace function redeem_invite_code(
  p_token     text,
  p_nickname  text
) returns uuid language plpgsql security definer as $$
declare
  v_invite    invite_codes;
  v_member_id uuid;
begin
  -- Lock and fetch valid invite
  select * into v_invite
  from invite_codes
  where token = p_token
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invite code';
  end if;

  -- Mark used
  update invite_codes set used_at = now() where token = p_token;

  -- If pre-linked to existing member (recovery path), use that member_id
  if v_invite.member_id is not null then
    v_member_id := v_invite.member_id;
    -- Update nickname if provided
    if p_nickname is not null and p_nickname != '' then
      update members set nickname = p_nickname where id = v_member_id;
    end if;
  else
    -- New member: create members row with nickname only
    insert into members (nickname, active)
    values (p_nickname, true)
    returning id into v_member_id;
  end if;

  -- Link profile to member
  update profiles set member_id = v_member_id where id = auth.uid();

  return v_member_id;
end;
$$;

-- Redeem recovery token: validates token, re-links current auth user to member
create or replace function redeem_recovery_token(p_token text)
returns uuid language plpgsql security definer as $$
declare
  v_rec       recovery_tokens;
begin
  select * into v_rec
  from recovery_tokens
  where token = p_token
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired recovery token';
  end if;

  update recovery_tokens set used_at = now() where token = p_token;
  update profiles set member_id = v_rec.member_id where id = auth.uid();

  return v_rec.member_id;
end;
$$;

-- Admin: generate batch recovery tokens for all active members
create or replace function generate_recovery_tokens_batch()
returns setof recovery_tokens language plpgsql security definer as $$
begin
  if get_my_club_role() != 'admin' then
    raise exception 'Admin only';
  end if;

  return query
  insert into recovery_tokens (member_id)
  select id from members where active = true
  returning *;
end;
$$;
```

**Checkpoint:** Run migration. Existing app is fully unaffected — no columns removed, no auth changed.

---

## Phase 2 — New Pages (Additive, Not Yet Wired to Router)

Build the new pages but do not add them to `src/App.tsx` routes yet. This lets
you test them in isolation.

### 2.1 `src/pages/JoinClub.tsx`

Three-step flow on a single page:

**Step 1 — Enter invite code**
```tsx
// Input: invite code (token from admin)
// On submit: validate format client-side (length check), proceed to step 2
```

**Step 2 — Pick nickname**
```tsx
// Input: nickname (text, 2–20 chars, English only per PIPA design)
// Show: "This is how you'll appear in the club. You can change it later."
// On submit: proceed to step 3
```

**Step 3 — Enroll passkey**
```tsx
// 1. supabase.auth.signInAnonymously()
// 2. redeem_invite_code(token, nickname) RPC
// 3. supabase.auth.mfa.enroll({ factorType: 'webauthn' })
//    → browser shows native Face ID / fingerprint prompt
// 4. On success: navigate('/')
```

**Optional Step 4 — Second device prompt**
```tsx
// "Add a second passkey (e.g. your laptop) for backup?"
// [Add now] [Skip]
// If Add now: trigger another mfa.enroll — WebAuthn hybrid transport
//   opens QR code natively in browser for other device to scan
```

### 2.2 `src/pages/Recover.tsx`

Single-step flow:

```tsx
// 1. supabase.auth.signInAnonymously()  — new anonymous session
// 2. Input: recovery token
// 3. redeem_recovery_token(token) RPC
//    → links new anonymous auth.users.id to existing members.id
// 4. supabase.auth.mfa.enroll({ factorType: 'webauthn' })
//    → re-enroll passkey on new device
// 5. navigate('/')
```

### 2.3 `src/pages/Login.tsx` — Passkey Version

Replace email/password form with:

```tsx
// Primary: "Sign in with passkey" button
//   → supabase.auth.signInWithPasskey()
//   → browser handles Face ID / fingerprint / QR for other device

// Secondary links:
//   "New member? Enter invite code" → /join
//   "Lost access? Use recovery token" → /recover
```

### 2.4 Admin UI — Generate Invites + Recovery Tokens

Add to `src/pages/Members.tsx` (admin-only section):

```tsx
// Button: "Generate invite code" (per member row)
//   → INSERT into invite_codes with member_id = member.id
//   → Show generated token in modal: copy + QR

// Button: "Generate recovery tokens for all" (header action)
//   → RPC: generate_recovery_tokens_batch()
//   → Show list of nickname:token pairs for copying into group chat
```

---

## Phase 3 — Wire New Routes into App.tsx

Update `src/App.tsx`:

```tsx
// Add routes:
<Route path="/join" element={<JoinClub />} />
<Route path="/recover" element={<Recover />} />

// Update /login to use new Login page (passkey version)
// Update /link-profile redirect: since invite redemption sets member_id
//   at join time, LinkedRoute should redirect to /join (not /link-profile)
//   for unlinked users going forward

// Keep /link-profile route temporarily for existing email-auth users
//   until Phase 4 migration is complete, then remove it
```

Update `src/App.tsx` `LinkedRoute`:

```tsx
// Change: if (!isLinked) return <Navigate to="/link-profile" replace />;
// To:     if (!isLinked) return <Navigate to="/join" replace />;
```

**Checkpoint:** New auth flow works end-to-end. Existing email/password accounts
still work via `/login` (old form still accessible). Both systems live in parallel.

---

## Phase 4 — Data Migration (Remove PII from `members` Table)

Run only after Phase 3 is stable and all existing members have been migrated
to anonymous auth + passkey.

**File:** `supabase/migrations/20260529_pii_minimize_phase4.sql`

### 4.1 Backfill `nickname` from `name`

```sql
-- Copy existing names to nickname where nickname is not yet set
update members set nickname = name where nickname is null;
```

### 4.2 Drop `email` and Rename `name` → (make nullable, then drop)

```sql
-- Make name nullable first (non-breaking)
alter table members alter column name drop not null;

-- Drop email
alter table members drop column if exists email;

-- After confirming nickname backfill is complete:
-- alter table members drop column name;
-- (Do this in a separate migration after verifying all queries use nickname)
```

### 4.3 Update `members` Unique Constraint

```sql
-- email was unique; nickname does not need to be unique
-- (two members can have same nickname — UUID is the real identity)
-- No action needed unless you want to enforce nickname uniqueness per club
```

### 4.4 Migrate Existing Email Auth Users

For each existing member with an email/password account:
1. Admin generates an invite code pre-linked to their `members.id`
2. Member visits `/join`, enters code, picks nickname, enrolls passkey
3. Old `auth.users` email account is deleted by admin via Supabase Dashboard
   or: member triggers account deletion themselves after switching

This is manual but one-time. For a 20–40 person club it takes one meeting.

---

## Phase 5 — Cleanup (After All Members Migrated)

### 5.1 Remove Old Login Form

- Delete email/password form from `src/pages/Login.tsx` entirely
- Remove `src/pages/LinkProfile.tsx`
- Remove `/link-profile` route from `src/App.tsx`

### 5.2 Drop `name` Column from `members`

```sql
-- supabase/migrations/20260529_pii_minimize_phase5.sql
alter table members drop column if exists name;
alter table members alter column nickname set not null;
```

### 5.3 Update All Queries That Reference `members.name` → `members.nickname`

Files to update (search for `.name` on members queries):
- `src/hooks/useMembers.ts` — `order("name")` → `order("nickname")`
- `src/hooks/useAnalytics.ts` — member name references
- `src/pages/MemberDetail.tsx` — `member.name` → `member.nickname`
- `src/pages/Members.tsx` — display name
- `src/pages/Analytics.tsx` — `member.memberName`
- `src/types/database.ts` — `Member.name` → `Member.nickname`
- `src/components/meetings/RoleAssignment.tsx` — member display
- Any other component that renders member names

### 5.4 Update RLS — Tighten `members` Read

Now that there is no email, the blanket authenticated read is lower risk,
but tighten anyway:

```sql
-- Replace current policy:
-- "members: authenticated read" (selects all columns)
-- With column-level exposure (nickname + id + active only for non-admins)
-- Postgres does not support column-level RLS directly, but a view works:

create or replace view member_public as
  select id, nickname, active from members;

-- Grant SELECT on view to authenticated role
-- Use member_public in non-admin queries instead of members directly
```

### 5.5 Add 4-Line Privacy Notice to JoinClub Page

Per PIPA minimum obligation:

```tsx
<p>
  This app stores your chosen nickname and club activity records
  (speeches, roles, scores) on AWS servers. No real name or contact
  information is collected. Delete your account anytime in Settings.
</p>
```

### 5.6 Add Account Deletion

Add to a Settings page or profile dropdown:

```sql
create or replace function delete_my_account()
returns void language plpgsql security definer as $$
begin
  -- Nullify member activity (keep aggregate stats, remove identity link)
  update meeting_roles set member_id = null where member_id = get_my_member_id();
  update speeches set speaker_id = null where speaker_id = get_my_member_id();
  update speeches set evaluator_id = null where evaluator_id = get_my_member_id();
  update votes set voter_id = null where voter_id = get_my_member_id();
  update speech_comments set commenter_id = null where commenter_id = get_my_member_id();

  -- Delete member row and profile
  delete from members where id = get_my_member_id();
  delete from profiles where id = auth.uid();

  -- Delete auth user (cascades profile via FK)
  delete from auth.users where id = auth.uid();
end;
$$;
```

---

## File Change Summary

### New Files
```
supabase/migrations/20260529_pii_minimize.sql         Phase 1
supabase/migrations/20260529_pii_minimize_phase4.sql  Phase 4
supabase/migrations/20260529_pii_minimize_phase5.sql  Phase 5
src/pages/JoinClub.tsx                                Phase 2
src/pages/Recover.tsx                                 Phase 2
```

### Modified Files
```
src/pages/Login.tsx              Phase 2 — replace email form with passkey
src/pages/Members.tsx            Phase 2 — add invite/recovery token generation
src/App.tsx                      Phase 3 — add /join, /recover routes
src/hooks/useMembers.ts          Phase 5 — name → nickname
src/types/database.ts            Phase 5 — Member.name → Member.nickname
src/pages/MemberDetail.tsx       Phase 5 — member.name → member.nickname
src/pages/Analytics.tsx          Phase 5 — memberName reference
src/components/meetings/RoleAssignment.tsx  Phase 5 — member display
```

### Deleted Files
```
src/pages/LinkProfile.tsx        Phase 5 — no longer needed
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Member loses passkey + recovery token | Low | Admin re-link via invite code (always available) |
| Member on old browser without WebAuthn | Low | Safari 16+, Chrome 108+, Firefox 119+ all support it; club can require update |
| Admin forgets to generate recovery tokens | Medium | Batch generation button makes it one click per meeting |
| Existing member loses email account before migration | Low | Phase 4 is manual per-member — admin controls timing |
| Supabase WebAuthn MFA not on current plan | Medium | Check plan before Phase 2; fallback: use SimpleWebAuthn via Edge Function |

---

## PIPA Compliance After Completion

| Obligation | Status |
|-----------|--------|
| Consent form | Not required — no personal information collected |
| Full privacy policy page | Replaced by 4-line inline notice (Phase 5.5) |
| DPO designation | Not required — no personal information processed |
| Data subject access/export | Trivial — all data under one UUID |
| Email exposure RLS | Eliminated — no email column exists |
| Overseas transfer disclosure | One sentence in privacy notice (AWS region) |
| Breach notification complexity | Minimal — leaked data has no real-world anchor |
| Account deletion right | Implemented in Phase 5.6 |
