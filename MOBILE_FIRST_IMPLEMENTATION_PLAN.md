# Progress Dashboard — Full Implementation Plan

> Mobile-first redesign with gamification layer. Based on hi-fi designs + UX analysis.
> Each phase is self-contained and can be prompted separately.

---

## Implementation Order

| Phase | File(s)                                | Complexity | Depends On  |
| ----- | -------------------------------------- | ---------- | ----------- |
| 0     | `src/index.css` + `tailwind.config.js` | Medium     | —           |
| 1     | `src/components/ui/AppShell.tsx`       | Medium     | Phase 0     |
| 11    | `src/lib/roleMeta.ts` (new)            | Low        | —           |
| 2     | `src/pages/Dashboard.tsx`              | High       | Phase 0, 1  |
| 3     | `src/pages/RoleSignup.tsx`             | Medium     | Phase 0, 11 |
| 4     | `src/pages/MyRoleDashboard.tsx`        | Medium     | Phase 0, 11 |
| 5     | `src/pages/MemberDetail.tsx`           | High       | Phase 0     |
| 6     | `src/pages/Meetings.tsx`               | Low        | Phase 0     |
| 7     | `src/pages/MeetingDetail.tsx`          | High       | Phase 0, 11 |
| 8     | `src/pages/Analytics.tsx`              | Medium     | Phase 0     |
| 9     | `src/pages/Members.tsx`                | Low        | Phase 0     |
| 10    | `src/pages/Login.tsx`                  | Low        | Phase 0     |

---

## Phase 0 — CSS Foundation + Design Tokens

**Files:** `src/index.css`, `tailwind.config.js`

### Goals

- Add new semantic design tokens needed across all phases
- Fix primary color inconsistency (config uses `#137fec`, CSS token uses `59 130 246`)
- Add keyframe animations
- Add reusable utility component classes
- Change `.app-bottom-nav` from 4-column to 5-column grid

### New CSS Tokens (add to `:root`)

```css
--color-hero-bg: 10 18 38; /* dark navy for hero card */
--color-hero-text: 248 250 252; /* near-white for hero card */
--color-xp-gold: 251 191 36; /* amber-400, XP badge color */
--color-level: 139 92 246; /* violet-500, level indicator */
--color-role-speaker: 59 130 246; /* blue */
--color-role-evaluator: 16 185 129; /* emerald */
--color-role-facilitator: 139 92 246; /* violet */
--color-role-timer: 245 158 11; /* amber */
--color-role-grammar: 236 72 153; /* pink */
--color-role-ah: 239 68 68; /* red */
--color-role-vote: 99 102 241; /* indigo */
```

### New Keyframes

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes shimmer {
  from {
    background-position: -200% 0;
  }
  to {
    background-position: 200% 0;
  }
}
@keyframes check-pop {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.25);
  }
}
@keyframes progress-fill {
  from {
    width: 0;
  }
  to {
    width: var(--progress-to);
  }
}
```

### New Utility Classes (add to `@layer components`)

```css
.skeleton { background: linear-gradient(90deg, ...); animation: shimmer 1.6s infinite; }
.progress-bar-track { ... }
.progress-bar-fill { ... }
.xp-badge { background: rgba(var(--color-xp-gold)/0.15); color: rgb(var(--color-xp-gold)); ... }
.level-badge { background: rgba(var(--color-level)/0.12); color: rgb(var(--color-level)); ... }
.role-card { ... }
.quick-action { ... }
.checklist-item { ... }
.checklist-item.is-checked { ... }
.hero-card { background: rgb(var(--color-hero-bg)); color: rgb(var(--color-hero-text)); ... }
.achievement-badge { ... }
.achievement-badge.is-locked { filter: grayscale(1); opacity: 0.4; }
```

### Bottom Nav Grid Fix

```css
/* Change 4-column to 5-column */
.app-bottom-nav {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
```

### Tailwind Config Fix

- Align `primary` color to `"rgb(var(--color-primary))"` pattern
- Add `hero`, `xp-gold`, `level` color keys

---

## Phase 1 — AppShell Navigation

**File:** `src/components/ui/AppShell.tsx`

### Goals

- Unify admin and member nav into one 5-tab structure
- Move Sign Out to desktop avatar dropdown, not a mobile tab
- Active tab shows filled icon variant
- Add notification bell placeholder (desktop)
- Add member avatar initials circle (desktop)

### New Nav Structure (both roles)

```
Tab 1: Home       → /           icon: home / home_filled
Tab 2: Meetings   → /meetings   icon: calendar_month / calendar_month_filled
Tab 3: Roles      → /role-signup or /my-role/:id  icon: groups / groups_filled
Tab 4: Stats      → /analytics  icon: bar_chart / bar_chart_filled
Tab 5: Profile    → /members/:memberId  icon: person / person_filled
```

### Desktop Changes

- Brand pill stays on the left
- Nav pills stay in the center
- Right side: notification bell icon + avatar circle with initials
- Clicking avatar shows dropdown: member name, email, Sign Out link

### Mobile Changes

- 5 equal-width tabs, no Sign Out tab
- Sign Out only accessible via Profile page or desktop avatar menu

### Filled Icon Logic

```tsx
// When route matches, use filled variant
const icon = isActive ? `${baseIcon}` : baseIcon;
// Material Symbols filled: set font-variation-settings FILL to 1
// className={isActive ? "icon-filled" : ""}
```

### CSS addition for filled icons

```css
.icon-filled {
  font-variation-settings:
    "FILL" 1,
    "wght" 500,
    "GRAD" 0,
    "opsz" 24;
}
```

---

## Phase 2 — Dashboard (Home)

**File:** `src/pages/Dashboard.tsx`

### Goals

- Personalized first-name greeting (not email)
- Dark navy hero card on desktop with live session countdown
- XP + level display for member
- Quick-action shortcuts (3–4 tappable cards)
- "Your role for next session" card (if assigned)
- Recent activity feed (last 3 meetings)

### New Sub-Components (inline, same file)

```tsx
// HeroCard — dark navy, desktop-only wrapper
// CountdownDisplay — live countdown using useEffect + setInterval
// QuickActionGrid — 3 cards: View Schedule, Sign Up for a Role, My Progress
// RoleTeaser — "You're the Timer for June 12" card
// ActivityFeed — last 3 completed meetings as timeline
// XPBar — level name + progress bar + next level label
```

### Data Needs

- `useProfile()` — for first name, XP, level
- `useMeetings()` — for next upcoming meeting date + id
- `useMyCurrentRole(nextMeetingId)` — new hook OR inline query using existing hooks
- `useMeetings()` filtered for recent completed meetings

### Countdown Hook

```tsx
function useCountdown(targetDate: string) {
  // returns { days, hours, minutes, seconds }
  // useEffect with setInterval(1000), cleanup on unmount
}
```

### XP / Level Logic (pure functions, extract to `src/lib/gamification.ts`)

```ts
export const LEVELS = [
  { name: "Newcomer", minXp: 0 },
  { name: "Apprentice", minXp: 100 },
  { name: "Contributor", minXp: 300 },
  { name: "Performer", minXp: 600 },
  { name: "Veteran", minXp: 1000 },
  { name: "Legend", minXp: 1500 },
]
export function getMemberLevel(xp: number): Level { ... }
export function getLevelProgress(xp: number): number { ... } // 0–1
```

### Layout

- Mobile: greeting → XP bar → role teaser → quick actions → activity feed
- Desktop: greeting row → two columns: (hero card + quick actions) | (role teaser + activity feed)

---

## Phase 3 — Role Signup

**File:** `src/pages/RoleSignup.tsx`

### Goals

- Each role card has a unique icon + accent color from `ROLE_META`
- Open roles show XP badge ("+ 50 XP")
- Filled roles show member avatar + name
- After signing up: celebration banner + confetti-like CSS animation
- Skeleton loading states (3–4 skeleton cards while loading)
- "You're signed up" pill on the member's own role

### ROLE_META (use from `src/lib/roleMeta.ts` created in Phase 11)

```ts
export const ROLE_META: Record<string, RoleMeta> = {
  toastmaster: {
    label: "Toastmaster",
    icon: "mic",
    color: "role-facilitator",
    xp: 80,
  },
  speaker: {
    label: "Speaker",
    icon: "record_voice_over",
    color: "role-speaker",
    xp: 60,
  },
  evaluator: {
    label: "Evaluator",
    icon: "rate_review",
    color: "role-evaluator",
    xp: 50,
  },
  timer: { label: "Timer", icon: "timer", color: "role-timer", xp: 30 },
  grammarian: {
    label: "Grammarian",
    icon: "spellcheck",
    color: "role-grammar",
    xp: 30,
  },
  ah_counter: {
    label: "Ah Counter",
    icon: "record_voice_over",
    color: "role-ah",
    xp: 30,
  },
  vote_counter: {
    label: "Vote Counter",
    icon: "how_to_vote",
    color: "role-vote",
    xp: 20,
  },
};
```

### Card States

1. **Open** — accent border, role icon, role name, XP badge, "Sign Up" button
2. **Filled by someone else** — dimmed, avatar circle + name, locked icon
3. **Filled by me** — green check, "You're signed up" pill, option to withdraw

### Celebration Banner

```tsx
// Appears after successful signup mutation
// Full-width banner: "You're the [Role]! +50 XP earned"
// Dismissible, auto-dismisses after 4 seconds
// CSS animation: fade-in-up
```

---

## Phase 4 — My Role Dashboard

**File:** `src/pages/MyRoleDashboard.tsx`

### Goals

- Replace all 7 static panel functions with a single interactive checklist component
- Progress bar fills as items are checked
- Gold bar + celebration text at 100%
- Role identity header with icon + color from `ROLE_META`

### Checklist Data (define as constant in file)

```ts
const CHECKLISTS: Record<string, string[]> = {
  toastmaster: [
    "Prepare the meeting agenda",
    "Confirm all role-players are ready",
    "Open the meeting and introduce theme",
    "Manage time and keep meeting on track",
    "Introduce each speaker",
    "Summarize the meeting and close",
  ],
  speaker: [
    "Choose your speech project and objectives",
    "Prepare and rehearse your speech",
    "Submit title and bio to Toastmaster",
    "Deliver speech within time limit",
    "Receive and reflect on evaluations",
  ],
  evaluator: [
    "Review speaker's manual project objectives",
    "Listen actively during the speech",
    "Note strengths and areas for improvement",
    "Deliver 2–3 min verbal evaluation",
    "Submit written feedback",
  ],
  timer: [
    "Prepare timing cards (green/yellow/red)",
    "Explain timing rules to the room",
    "Time each speaker and role segment",
    "Report all times to Toastmaster",
  ],
  grammarian: [
    "Choose a Word of the Day",
    "Introduce Word of the Day at the start",
    "Track good language use throughout",
    "Note filler words and grammar issues",
    "Report grammar observations at end",
  ],
  ah_counter: [
    "Explain your role briefly at the start",
    "Track filler words (ah, um, er, so, you know)",
    "Keep a tally per speaker",
    "Report counts at end of meeting",
  ],
  vote_counter: [
    "Distribute ballots for Best Speaker",
    "Distribute ballots for Best Evaluator",
    "Collect and count all ballots",
    "Report results to Toastmaster",
  ],
};
```

### ChecklistPanel Component

```tsx
function ChecklistPanel({ role }: { role: string }) {
  const items = CHECKLISTS[role] ?? [];
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const progress = checked.size / items.length;

  // Toggle: add/remove from Set, trigger check-pop animation on icon
  // Progress bar: CSS var --progress-to set inline, animated on change
  // At 100%: gold bar class, celebration message
}
```

### Layout per Role

- Role header: icon (from ROLE_META) + role name + XP value
- Progress bar: "X / Y completed" label + animated fill
- Checklist: each item is a tappable row, tap toggles check
- Checked items: text gets line-through + muted color, check icon animates

---

## Phase 5 — Member Detail

**File:** `src/pages/MemberDetail.tsx`

### Goals

- Avatar initials circle (large, primary-colored)
- Level system: `getMemberLevel(xp)` → named level + color badge
- XP progress bar to next level
- 8 achievement badges (unlocked = amber glow, locked = grayscale)
- Role history cards with fill progress bars
- Stats row: speeches, roles, meetings attended

### Level System (use from `src/lib/gamification.ts`)

```ts
// Already defined in Phase 2
// Display: "Level 3 · Contributor" + bar showing progress to Level 4
```

### Achievement Badges (define inline or in `src/lib/gamification.ts`)

```ts
const ACHIEVEMENTS = [
  {
    id: "first_speech",
    label: "First Speech",
    icon: "mic",
    condition: (m) => m.speeches >= 1,
  },
  {
    id: "five_roles",
    label: "5 Roles",
    icon: "groups",
    condition: (m) => m.roles >= 5,
  },
  {
    id: "ten_meetings",
    label: "10 Meetings",
    icon: "calendar_month",
    condition: (m) => m.meetings >= 10,
  },
  {
    id: "evaluator",
    label: "First Eval",
    icon: "rate_review",
    condition: (m) => m.evaluations >= 1,
  },
  {
    id: "five_speeches",
    label: "5 Speeches",
    icon: "record_voice_over",
    condition: (m) => m.speeches >= 5,
  },
  {
    id: "facilitator",
    label: "Facilitator",
    icon: "manage_accounts",
    condition: (m) => m.timesAsTM >= 1,
  },
  {
    id: "veteran",
    label: "Veteran",
    icon: "military_tech",
    condition: (m) => m.meetings >= 25,
  },
  {
    id: "legend",
    label: "Legend",
    icon: "emoji_events",
    condition: (m) => m.xp >= 1500,
  },
];
```

### Badge Grid

- 4 columns on mobile, 8 in a row on desktop
- Unlocked: amber background, full color icon, label below
- Locked: grayscale, opacity 0.4, "Locked" label

### Role Cards

- Each role in history: icon + role name + meeting date
- Progress bar showing how many times each role type completed vs. a soft "mastery" target (e.g., 5× = mastered)

---

## Phase 6 — Meetings (Meetings List)

**File:** `src/pages/Meetings.tsx`

### Goals

- Stat cards with icons (not just numbers)
- Skeleton loading (3 skeleton cards while loading)
- Empty state with illustration-like icon
- Fade-in-up animation on cards as they load
- Status badge clickable for admins (already implemented, just needs visual polish)

### Stat Card Icons

```
Total: calendar_month (primary)
Upcoming: upcoming (amber)
Completed: task_alt (emerald)
```

### Skeleton Card

```tsx
function MeetingCardSkeleton() {
  return (
    <div className="app-panel rounded-[1.5rem] p-5 animate-pulse">
      <div className="skeleton h-3 w-24 rounded-full" />
      <div className="skeleton mt-3 h-6 w-48 rounded-full" />
      <div className="skeleton mt-2 h-3 w-32 rounded-full" />
    </div>
  );
}
```

### Empty State

```tsx
<div className="...text-center py-16">
  <span className="material-symbols-outlined text-5xl text-app-text-subtle">
    calendar_month
  </span>
  <p className="mt-4 text-app-text-muted">No meetings yet.</p>
  {isAdmin && <button>Create First Session</button>}
</div>
```

---

## Phase 7 — Meeting Detail (Session Detail)

**File:** `src/pages/MeetingDetail.tsx`

> ⚠️ Do NOT touch `src/components/meetings/RoleAssignment.tsx` — it is 1274 lines of complex admin logic.

### Goals

- Enhanced session header: theme, date, location, status badge, + countdown for upcoming meetings
- Role cards in `MemberRolesView` use `ROLE_META` icons + colors (matching Phase 3 visual language)
- Speeches section: each speech card shows speaker avatar + title + time
- Stats mini-cards get icons

### Header Enhancement

```tsx
// For upcoming meetings: show CountdownDisplay component (from Phase 2)
// For completed meetings: show "Meeting Complete" check badge
```

### MemberRolesView Enhancement

```tsx
// Replace plain text list with role cards using ROLE_META
// Same card design as RoleSignup (Phase 3) but read-only
// Shows: role icon, role name, assigned member name + avatar
```

### What NOT to change

- `<RoleAssignment>` component (admin view) — entirely off-limits
- Voting section logic
- Speech comments logic
- Any data fetching hooks

---

## Phase 8 — Analytics

**File:** `src/pages/Analytics.tsx`

### Goals

- Stat cards get trend indicators (+N% vs last period)
- Role distribution PieChart gets `ROLE_META` colors
- AreaChart gets gradient fills matching primary color token
- Section headings use `.app-eyebrow` pattern
- Consistent card spacing with other pages

### Trend Indicator

```tsx
function TrendBadge({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? "text-app-success" : "text-app-danger"}>
      <span className="material-symbols-outlined text-sm">
        {value >= 0 ? "trending_up" : "trending_down"}
      </span>
      {Math.abs(value)}%
    </span>
  );
}
```

### PieChart Colors

```ts
// Map role names to ROLE_META colors for consistent identity across the app
const CHART_COLORS = Object.fromEntries(
  Object.entries(ROLE_META).map(([k, v]) => [
    k,
    `rgb(var(--color-${v.color}))`,
  ]),
);
```

---

## Phase 9 — Members List

**File:** `src/pages/Members.tsx`

### Goals

- Member cards show avatar initials circle
- Level badge on each card
- Skeleton loading states
- Empty state

### Member Card

```tsx
// Avatar: colored circle with initials (first letter of first + last name)
// Level badge: from getMemberLevel(xp) — small pill under name
// Stats: speech count + role count inline
```

---

## Phase 10 — Login Page

**File:** `src/pages/Login.tsx`

### Goals (minor polish only — page is already well-designed)

- Update subtitle copy to be generic ("ProgressyL" not just Toastmasters)
- Ensure club name is configurable via a constant at the top of the file
- No structural changes needed

---

## Phase 11 — Shared Extractions

**Files:** `src/lib/roleMeta.ts` (new), `src/lib/gamification.ts` (new)

### `src/lib/roleMeta.ts`

```ts
export interface RoleMeta {
  label: string
  icon: string          // Material Symbols name
  color: string         // CSS token suffix, e.g. "role-speaker"
  xp: number            // XP awarded for completing this role
  description: string   // One-line description shown on role card
}

export const ROLE_META: Record<string, RoleMeta> = { ... }
```

### `src/lib/gamification.ts`

```ts
export interface Level {
  name: string
  minXp: number
  color: string   // e.g. "text-violet-500"
}

export const LEVELS: Level[] = [ ... ]

export function getMemberLevel(xp: number): Level { ... }
export function getLevelProgress(xp: number): number { ... } // 0.0–1.0
export function getXpToNextLevel(xp: number): number { ... }

export interface Achievement {
  id: string
  label: string
  icon: string
  condition: (stats: MemberStats) => boolean
}

export interface MemberStats {
  speeches: number
  roles: number
  meetings: number
  evaluations: number
  timesAsTM: number
  xp: number
}

export const ACHIEVEMENTS: Achievement[] = [ ... ]

export function getAchievements(stats: MemberStats): { achievement: Achievement; unlocked: boolean }[] {
  return ACHIEVEMENTS.map(a => ({ achievement: a, unlocked: a.condition(stats) }))
}
```

> Phase 11 should be created first (before Phase 2, 3, 4, 5) since multiple phases depend on it.

---

## Cross-Cutting Design Decisions

These apply to every screen and must be consistent:

1. **Animation timing**: All fade-in-up animations use `0.25s ease` with `animation-fill-mode: both`. Stagger list items by `animation-delay: calc(index * 40ms)`.

2. **Loading states**: Every data-dependent section shows skeleton cards, never a blank white box. Skeletons match the rough shape of the real content.

3. **Empty states**: Every list/grid has a designed empty state with a relevant icon, a one-line message, and (for admins) a CTA button.

4. **Role identity**: Role colors from `ROLE_META` are used consistently across Role Signup, My Role Dashboard, Meeting Detail, and Analytics. Same icon, same color, every time.

5. **Gamification language**: "XP" not "points". Level names from `LEVELS` constant. Never raw numbers alone — always provide context ("Level 3 of 6").

6. **Admin vs Member**: All admin-only UI is conditionally rendered with `{isAdmin && ...}`. Member UI never shows admin controls even if they navigate directly. Use `useProfile()` for the `isAdmin` flag.

7. **Touch targets**: All interactive elements on mobile are minimum 44×44px. Tap area is generous, especially for checklist items and role cards.

8. **No dark mode**: The hero card on Dashboard uses a local dark class (`.hero-card`), not a global theme toggle. `darkMode: "class"` in Tailwind config is present but the dark class is never applied to `<html>`.

---

## Key Constraints

- **Do not modify** `src/components/meetings/RoleAssignment.tsx` (1274 lines, complex admin logic)
- **Do not add** packages without checking if existing ones cover the need (Recharts already in bundle)
- **Do not change** database schema or Supabase queries — only UI layer changes
- **Keep** React Query mutation patterns consistent with existing hooks in `src/hooks/`
- **Use** `AppShell` wrapper on every page — never bypass it
- **Icons** are Material Symbols Outlined via CDN font, not an npm package — use `<span className="material-symbols-outlined">icon_name</span>`

---

## Files NOT in Scope

These files should not be modified during this redesign:

- `src/hooks/` — all existing hooks stay as-is
- `src/lib/supabase.ts` — database client
- `src/types/database.ts` — TypeScript interfaces
- `src/components/meetings/RoleAssignment.tsx` — admin role assignment UI
- `src/components/meetings/MeetingForm.tsx` — meeting creation/edit form
- `src/app/AuthContext.ts` — auth state
- `src/App.tsx` — routing

---

_Generated: 2026-05-28 | Project: toastmasters-dashboard | Branch: feat/add-public-key-signin-logic_
