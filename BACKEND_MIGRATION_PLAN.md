# End-to-End Custom Backend Implementation Plan
## Toastmasters Dashboard — Supabase → Go Backend Migration

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current System — Deep Analysis](#2-current-system--deep-analysis)
3. [Limitations of Current Architecture](#3-limitations-of-current-architecture)
4. [Technology Decision — Go vs Node.js](#4-technology-decision--go-vs-nodejs)
5. [Proposed System Architecture](#5-proposed-system-architecture)
6. [Code Structure & Project Layout](#6-code-structure--project-layout)
7. [Database Strategy](#7-database-strategy)
8. [Authentication & Security System](#8-authentication--security-system)
9. [REST API Design](#9-rest-api-design)
10. [Realtime WebSocket Architecture](#10-realtime-websocket-architecture)
11. [Business Logic Layer (RPC Replacement)](#11-business-logic-layer-rpc-replacement)
12. [Authorization — From RLS to Middleware](#12-authorization--from-rls-to-middleware)
13. [Frontend Migration](#13-frontend-migration)
14. [Test Strategy & Scope](#14-test-strategy--scope)
15. [Development Best Practices](#15-development-best-practices)
16. [Observability, Logging & Monitoring](#16-observability-logging--monitoring)
17. [Scalability Design](#17-scalability-design)
18. [CI/CD Pipeline](#18-cicd-pipeline)
19. [Deployment Architecture](#19-deployment-architecture)
20. [Migration Execution Plan — Phase by Phase](#20-migration-execution-plan--phase-by-phase)
21. [Tradeoffs — Honest Assessment](#21-tradeoffs--honest-assessment)
22. [What This Prompt Didn't Ask But You Need](#22-what-this-prompt-didnt-ask-but-you-need)

---

## 1. Executive Summary

**Goal:** Replace Supabase (PostgREST + GoTrue Auth + Realtime) with a custom Go HTTP server connected directly to PostgreSQL.

**Why this matters:** Supabase is excellent for rapid prototyping. It abstracts away auth, authorization, realtime, and CRUD API generation. But those abstractions come with a ceiling — you cannot optimize query plans, you cannot add custom middleware, you cannot control JWT claims, you cannot horizontally scale the realtime layer independently, and you are billed for compute you don't control. Building a custom backend gives you full ownership of every layer.

**What stays the same:** PostgreSQL database schema (all 13 tables, all indexes, all migrations). The database is already well-designed. You keep it.

**What gets replaced:**
- Supabase Auth (GoTrue) → Custom JWT auth with refresh token rotation
- PostgREST → Go HTTP handlers with `chi` router
- Supabase Realtime → Go WebSocket hub with `pg_notify`
- RLS Policies → Middleware + service-layer authorization
- RPC Functions → Go service functions backed by transactions

**Effort:** ~3–4 weeks solo. ~1.5 weeks with two developers.

---

## 2. Current System — Deep Analysis

### 2.1 What Supabase Is Giving You Today

```
Browser (React 19 + PWA)
    │
    ├── @supabase/supabase-js (SDK)
    │       │
    │       ├── GoTrue (Auth Service)
    │       │     ├── POST /auth/v1/signup
    │       │     ├── POST /auth/v1/token?grant_type=password
    │       │     ├── POST /auth/v1/token?grant_type=refresh_token
    │       │     └── GET  /auth/v1/user
    │       │
    │       ├── PostgREST (Auto REST API)
    │       │     ├── GET  /rest/v1/members?select=*&active=eq.true
    │       │     ├── POST /rest/v1/meeting_roles
    │       │     ├── PATCH/rest/v1/meeting_roles?id=eq.{id}
    │       │     └── POST /rest/v1/rpc/claim_meeting_role
    │       │
    │       └── Realtime (WebSocket)
    │             ├── Channel: open_meeting_roles_{meetingId}
    │             └── Channel: role_signups_{meetingId}
    │
    └── PostgreSQL 15
          ├── 13 tables + 30+ indexes
          ├── RLS on every table (20+ policies)
          ├── 5 RPC functions (PL/pgSQL)
          └── 3 helper functions (get_my_club_role, get_my_member_id, etc.)
```

### 2.2 Current Request Flow (Auth Example)

```
Login click → supabase.auth.signInWithPassword()
    → POST https://{project}.supabase.co/auth/v1/token
    → GoTrue validates bcrypt hash in auth.users
    → Returns: { access_token (JWT 1h), refresh_token }
    → AuthProvider receives onAuthStateChange event
    → fetchProfile() → PostgREST GET /profiles?id=eq.{uid}
    → autoLinkByEmail() if member_id is null
    → Context updated: { user, profile, memberId, isAdmin }
```

### 2.3 Current Request Flow (Race-Safe Role Claim)

```
User clicks "Claim Role" → useClaimMeetingRole.mutate(roleId)
    → supabase.rpc('claim_meeting_role', { p_meeting_role_id })
    → PostgREST → PostgreSQL RPC
    → BEGIN TRANSACTION
    → SELECT FROM meeting_roles WHERE id=? AND member_id IS NULL
      AND signup_open=true FOR UPDATE SKIP LOCKED
    → If found: UPDATE member_id=?, status='assigned'
    → COMMIT
    → Returns updated row
    → queryClient.invalidateQueries(['meeting_roles', 'open_meeting_roles'])
    → Realtime channel picks up the change via CDC
    → All other users' UIs update automatically
```

### 2.4 Current AuthProvider Pattern

The `AuthProvider.tsx` manages three async operations on startup:
1. `getSession()` — retrieves existing JWT from localStorage
2. `fetchProfile()` — queries `profiles` table via PostgREST
3. `autoLinkByEmail()` — conditionally links profile to member by email match

This is currently a sequential waterfall. The 5-second timeout is a defensive measure against Supabase being unreachable (for offline PWA support).

---

## 3. Limitations of Current Architecture

### 3.1 Security

**`anon_key` exposed in browser.** The `VITE_SUPABASE_ANON_KEY` is in every user's JavaScript bundle. While RLS mitigates risk, the key itself enables anyone to attempt direct API calls to your Supabase project. A custom backend has no public key — auth is a cookie or a Bearer token you issue yourself.

**RLS is invisible to your application.** When a query silently returns 0 rows because an RLS policy blocks it, your app gets no error — it just gets empty data. This is famously hard to debug. Application-layer authorization throws explicit errors you can log, monitor, and test.

**JWTs have a 1-hour lifetime.** Supabase issues 1-hour access tokens. That's long. In a custom system you can issue 15-minute access tokens with automatic rotation — drastically reducing the window for token theft.

### 3.2 Performance

**PostgREST is a generalized layer.** It cannot be told "for this query, use this specific index." It generates SQL from URL params. For your analytics query (which is a hand-crafted PL/pgSQL function returning aggregated JSON), you already worked around PostgREST by writing a stored procedure — proving you've hit the ceiling.

**Every request pays auth overhead.** PostgREST calls `auth.uid()` and your helper functions (`get_my_club_role()`, `get_my_member_id()`) on every single query, even when the same user makes 10 queries in 1 second. A custom backend resolves JWT claims once per request in middleware and passes the claims struct downstream — zero extra DB roundtrips.

**Connection pooling is Supabase-managed.** Supabase uses PgBouncer in transaction mode. You cannot tune pool size, timeout, or strategy. With `pgx/v5` pool directly, you control min/max connections, connection lifetime, and health checks.

**No query plan control.** PostgREST generates `SELECT * FROM table WHERE col = $1`. You cannot hint, rewrite, or batch queries.

### 3.3 Vendor Lock-In

**Your entire auth user table is locked in Supabase.** The `auth.users` table is in a Supabase-managed schema you cannot migrate easily. If Supabase raises prices, discontinues your tier, or has an outage, you have no fallback.

**Realtime depends on Supabase's multiplayer infrastructure.** The Realtime server is not your PostgreSQL — it's a separate Supabase service. If it's degraded (it has had incidents), your role signup page goes dark.

**Migration difficulty grows with time.** Every week you add more data to `auth.users`, more RLS policies, more RPC functions — the migration scope expands. Now is the right time.

### 3.4 Scalability Ceiling

**Supabase Free/Pro tiers have hard limits:**
- 500MB database (free), 8GB (pro)
- 200 concurrent connections (free), 400 (pro)
- 2 million Realtime messages/month (free)
- No horizontal scaling of any service

**You cannot deploy to your own region.** Supabase runs in a specific AWS region. If your club is in Southeast Asia, every request round-trips to AWS us-east-1 or wherever your project lives.

**You cannot add custom middleware.** Want to add request logging, rate limiting per user, or a cache layer? Impossible with PostgREST.

### 3.5 Operational

**No structured logs.** Supabase gives you a log viewer but not exportable structured logs. You can't feed logs into your own monitoring stack.

**No custom metrics.** You can't instrument "how many role claims per minute" or "p99 latency of analytics endpoint."

**Limited error visibility.** When a database error happens, PostgREST returns a generic error. You have no stack trace, no correlation ID, no ability to add context.

---

## 4. Technology Decision — Go vs Node.js

### 4.1 Benchmark Context (for your workload)

Your application is I/O-bound (PostgreSQL queries, WebSocket fan-out). At club scale (50–500 concurrent users) both languages handle the load trivially. The technical comparison matters for **operational profile**, **future ceiling**, and **developer experience** — not raw throughput at this scale.

### 4.2 Comparison Matrix

| Dimension | Go | Node.js (Hono/Fastify) | Winner |
|---|---|---|---|
| **Memory idle** | ~15–30 MB | ~80–150 MB | Go |
| **Throughput (I/O-bound)** | Excellent (goroutines) | Excellent (event loop) | Tie |
| **CPU-bound tasks** | Excellent (true parallelism) | Poor (single-threaded) | Go |
| **WebSocket concurrency** | 1 goroutine/conn (~4KB) | 1 callback chain | Go |
| **Deployment** | Single static binary | Node runtime required | Go |
| **Cold start** | ~5ms | ~300–800ms | Go |
| **Type safety** | Compile-time | TypeScript (runtime JS) | Go |
| **Shared types w/ frontend** | No | Yes (share Zod/TS types) | Node |
| **Development velocity** | Slower (verbose) | Faster (JS familiarity) | Node |
| **Ecosystem** | Sufficient | Massive | Node |
| **Error handling** | Explicit (no exceptions) | Implicit (try/catch) | Go (more predictable) |
| **DB driver quality** | `pgx/v5` — best in class | `pg`/`postgres.js` — good | Go |
| **`LISTEN/NOTIFY` support** | Native in pgx | Requires workaround | Go |
| **Docker image size** | ~10–20 MB (scratch) | ~150–300 MB (node:alpine) | Go |
| **Goroutine leak risk** | Real risk, needs discipline | Less common | Node |

### 4.3 The Decisive Factors for This App

**Reason 1 — Realtime is your most complex feature.** You have `pg_notify` → WebSocket fan-out. In Go, each WebSocket connection is a goroutine. `pgx` has native `conn.Exec(ctx, "LISTEN channel")` and `conn.WaitForNotification(ctx)`. This maps to: one goroutine listens to PostgreSQL, deserializes the notification, and sends to a channel. The hub goroutine reads from the channel and fans out to all subscribed connections. It's 50 lines of idiomatic Go. In Node.js, you'd use the `pg` `LISTEN` API (which uses a callback), bridge it to WebSocket clients — achievable but less ergonomic.

**Reason 2 — Race-safe role claims need transaction discipline.** The `claim_meeting_role` function currently uses `FOR UPDATE SKIP LOCKED`. In Go, this is a `pgx.Tx` with explicit locking SQL. The Go compiler forces you to handle every error path and defer rollback. In Node.js, error handling in async transaction flows is easy to get subtly wrong.

**Reason 3 — Operational simplicity.** One binary. `COPY` it to a VPS, `systemd` service, done. No `node_modules`, no runtime version management, no `pm2`.

**Reason 4 — Future ceiling.** If this club management app is the foundation of a SaaS product (multi-tenant, multiple clubs), Go's goroutine model handles 10,000 concurrent WebSocket connections on a single server. Node.js would need clustering.

### 4.4 Decision: Go

With: `chi` (router) + `pgx/v5` (PostgreSQL) + `gorilla/websocket` (WebSocket) + `golang-jwt/jwt/v5` (JWT) + `zap` (logging) + `otel` (tracing).

If the team has zero Go experience and the app needs to ship in 2 weeks, use **Hono on Bun** as the fallback — same language as frontend, type-sharing with Zod, and Bun's performance is competitive with Node.js.

---

## 5. Proposed System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   React 19 PWA (Vite)                           │
│  TanStack Query + Custom API Client + Native WebSocket          │
└──────────┬──────────────────────────────────┬───────────────────┘
           │ HTTPS REST                        │ WSS
           ▼                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    Go HTTP Server (chi)                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Middleware Chain                                    │    │
│  │  RequestID → Logger → CORS → RateLimit → Auth JWT   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │  Auth Handler  │  │  API Handlers │  │  WS Hub        │  │
│  │  /api/v1/auth  │  │  /api/v1/*    │  │  /ws           │  │
│  └───────┬───────┘  └──────┬────────┘  └───────┬────────┘  │
│          │                 │                    │            │
│  ┌───────▼─────────────────▼────────────────────▼────────┐  │
│  │                  Service Layer                          │  │
│  │  AuthService | MemberService | MeetingService | ...    │  │
│  └──────────────────────────┬──────────────────────────── ┘  │
│                             │                                 │
│  ┌──────────────────────────▼──────────────────────────────┐  │
│  │              Repository Layer (pgx/v5)                  │  │
│  │  MemberRepo | MeetingRepo | RoleRepo | AnalyticsRepo    │  │
│  └──────────────────────────┬──────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────┘
                              │
            ┌─────────────────▼──────────────────┐
            │         PostgreSQL 15               │
            │  (same schema, same data)           │
            │  pgx pool: min=5, max=25            │
            └────────────────────────────────────┘
                              │
                    LISTEN/NOTIFY channel
                              │
            ┌─────────────────▼──────────────────┐
            │    Notification Listener Goroutine  │
            │    (separate pgx conn, always on)   │
            │    → WS Hub → fan-out to clients    │
            └────────────────────────────────────┘
```

### 5.2 Data Flow: Role Claim (End-to-End)

```
1. User clicks "Claim"
2. Frontend: POST /api/v1/meeting-roles/{id}/claim
3. JWT middleware: parse Bearer token → extract claims{userId, memberId, role}
4. Handler: call RoleService.ClaimRole(ctx, meetingRoleID, claims.MemberID)
5. Service: BEGIN TRANSACTION
6. Service: SELECT FROM meeting_roles WHERE id=? AND member_id IS NULL
            AND signup_open=true FOR UPDATE SKIP LOCKED
7a. If not found → ROLLBACK → 409 Conflict
7b. If found → UPDATE member_id=?, status='assigned' → COMMIT → 200 OK
8. PostgreSQL trigger fires pg_notify('meeting_roles_changed', JSON payload)
9. Listener goroutine receives notification
10. Hub fan-out: send JSON to all WS clients subscribed to that meeting_id
11. Frontend WS handler: queryClient.invalidateQueries(['open_meeting_roles'])
12. All users' UIs refresh
```

---

## 6. Code Structure & Project Layout

### 6.1 Clean Architecture with Domain-Driven Design

The industry standard for production Go services is **Clean Architecture** (also called Hexagonal/Ports-and-Adapters). The key rule: **inner layers never import outer layers**. Business logic knows nothing about HTTP, databases, or WebSockets.

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Entry point only — wires everything together
│
├── internal/                    # Private packages (Go enforcement)
│   │
│   ├── domain/                  # Layer 1: Business entities — no imports from below
│   │   ├── member.go            # Member struct + domain errors
│   │   ├── meeting.go           # Meeting struct + MeetingStatus enum
│   │   ├── role.go              # Role, MeetingRole structs
│   │   ├── auth.go              # Credentials, Token, Claims structs
│   │   ├── vote.go              # Vote struct
│   │   ├── report.go            # GrammarianReport, EvaluatorReport, etc.
│   │   ├── analytics.go         # AnalyticsData struct
│   │   └── errors.go            # ErrNotFound, ErrConflict, ErrForbidden, etc.
│   │
│   ├── port/                    # Layer 2: Interfaces (Ports) — contracts only
│   │   ├── repository.go        # MemberRepository, MeetingRepository, etc.
│   │   ├── service.go           # AuthService, RoleService, etc. interfaces
│   │   └── notifier.go          # Notifier interface for WS hub
│   │
│   ├── service/                 # Layer 3: Business logic (Use Cases)
│   │   ├── auth_service.go      # Signup, Login, Refresh, Logout
│   │   ├── member_service.go    # ListMembers, CreateMember, etc.
│   │   ├── meeting_service.go   # ListMeetings, CreateMeeting, etc.
│   │   ├── role_service.go      # ClaimRole, UnclaimRole (with transactions)
│   │   ├── signup_service.go    # SignupForRole, WithdrawFromRole
│   │   ├── report_service.go    # UpsertReport (all report types)
│   │   ├── vote_service.go      # UpsertVote
│   │   ├── analytics_service.go # GetAnalytics
│   │   └── profile_service.go   # GetProfile, UpdateProfile, LinkProfile
│   │
│   ├── repository/              # Layer 4: DB Adapters (Postgres implementation)
│   │   ├── member_repo.go
│   │   ├── meeting_repo.go
│   │   ├── role_repo.go
│   │   ├── signup_repo.go
│   │   ├── report_repo.go
│   │   ├── vote_repo.go
│   │   ├── analytics_repo.go
│   │   ├── auth_repo.go         # users table, refresh_tokens table
│   │   ├── profile_repo.go
│   │   └── db.go                # pgx pool initialization
│   │
│   ├── transport/               # Layer 5: HTTP + WebSocket adapters
│   │   ├── http/
│   │   │   ├── server.go        # Server struct, routes registration
│   │   │   ├── auth_handler.go
│   │   │   ├── member_handler.go
│   │   │   ├── meeting_handler.go
│   │   │   ├── role_handler.go
│   │   │   ├── signup_handler.go
│   │   │   ├── report_handler.go
│   │   │   ├── vote_handler.go
│   │   │   ├── analytics_handler.go
│   │   │   ├── profile_handler.go
│   │   │   └── response.go      # Standard JSON response helpers
│   │   └── ws/
│   │       ├── hub.go           # WebSocket connection hub
│   │       ├── client.go        # Individual WS connection lifecycle
│   │       └── handler.go       # HTTP upgrade handler
│   │
│   └── middleware/
│       ├── auth.go              # JWT validation, inject Claims into context
│       ├── require_admin.go     # Admin role check
│       ├── require_linked.go    # member_id != null check
│       ├── rate_limit.go        # Per-IP and per-user rate limiting
│       ├── request_id.go        # Inject X-Request-ID
│       ├── logger.go            # Structured request logging
│       └── cors.go              # CORS headers
│
├── pkg/                         # Reusable, importable by other projects
│   ├── config/
│   │   └── config.go            # Load from env vars, validate on startup
│   ├── token/
│   │   └── jwt.go               # JWT sign/parse (no business logic)
│   └── crypto/
│       └── password.go          # bcrypt hash/compare
│
├── migrations/                  # Keep your existing Supabase migrations
│   └── ...                      # Add new ones here:
│       └── 20260610_add_users_table.sql   # Custom users + refresh_tokens
│
├── scripts/
│   ├── migrate-auth-users.sql   # One-time: copy auth.users to your users table
│   └── seed.sql                 # Development seed data
│
├── docker/
│   ├── Dockerfile               # Multi-stage build
│   └── docker-compose.yml       # Local dev: postgres + backend
│
├── .github/
│   └── workflows/
│       ├── ci.yml               # Test + lint on PR
│       └── deploy.yml           # Build + deploy on merge to main
│
├── go.mod
├── go.sum
├── .env.example
└── Makefile                     # make dev, make test, make build, make migrate
```

### 6.2 Why This Structure

**`internal/` prevents external import.** Go's compiler enforces that nothing outside this module can import `internal/` packages. This means your business logic cannot accidentally be imported by another service.

**`domain/` has zero dependencies.** No database imports, no HTTP imports. Your `Member` struct is just a Go struct. This is the most critical rule of Clean Architecture. It means you can test all business logic without a database.

**`port/` defines interfaces.** Every repository and service is defined as an interface. Handlers depend on interfaces, not concrete types. This is what makes mocking possible in tests.

**`service/` is where real work happens.** Services orchestrate repositories. They contain all business rules (role is available, user is authorized, meeting is upcoming, etc.). Services never know about HTTP status codes.

**`transport/` knows about HTTP.** Handlers translate HTTP → service call → HTTP response. They do input validation, call one service method, and return JSON. Handlers are thin.

**`repository/` knows about SQL.** Repos execute SQL via `pgx`. They return domain types or domain errors. They never return `pgx.Rows` to callers.

### 6.3 Naming Conventions

```go
// Domain error types (not string errors)
var (
    ErrNotFound     = errors.New("not found")
    ErrConflict     = errors.New("conflict")
    ErrForbidden    = errors.New("forbidden")
    ErrUnauthorized = errors.New("unauthorized")
    ErrBadRequest   = errors.New("bad request")
)

// Services always accept context as first arg
func (s *RoleService) ClaimRole(ctx context.Context, meetingRoleID uuid.UUID, memberID uuid.UUID) (*domain.MeetingRole, error)

// Repositories follow same pattern
func (r *RoleRepository) GetForUpdate(ctx context.Context, tx pgx.Tx, id uuid.UUID) (*domain.MeetingRole, error)

// Handlers follow: verb + noun
func (h *RoleHandler) ClaimRole(w http.ResponseWriter, r *http.Request)
```

---

## 7. Database Strategy

### 7.1 Current: What You Keep

**Keep everything in your existing PostgreSQL schema.** All 13 tables, all 30+ indexes, all constraints. The database is well-designed. You're not touching it.

**Remove the Supabase-specific pieces:**
- The `auth` schema (Supabase-managed) → replaced by your `users` table in `public`
- The `handle_new_user()` trigger on `auth.users` → replaced by signup handler logic
- Helper functions `get_my_club_role()`, `get_my_member_id()`, `i_hold_meeting_role()` → replaced by middleware
- All `auth.uid()` references in RLS policies → RLS removed entirely (see Section 12)
- The 5 RPC functions → replaced by Go service methods

### 7.2 New Tables (Migration)

```sql
-- New: your own users table (replaces auth.users)
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,           -- bcrypt, portable from GoTrue
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for login lookup
CREATE INDEX users_email_idx ON users (lower(email));

-- New: refresh tokens (for token rotation)
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,       -- SHA256 of actual token
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_agent TEXT,
    ip_address INET
);

CREATE INDEX refresh_tokens_user_id_idx    ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_token_hash_idx ON refresh_tokens (token_hash);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens (expires_at)
    WHERE revoked_at IS NULL;

-- Modify profiles: change reference from auth.users to your users table
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;

-- pg_notify triggers for realtime
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify(
    TG_TABLE_NAME || '_changed',
    json_build_object('op', TG_OP, 'id',
      CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
      'meeting_id',
      CASE TG_OP WHEN 'DELETE' THEN OLD.meeting_id ELSE NEW.meeting_id END
    )::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER meeting_roles_notify
  AFTER INSERT OR UPDATE OR DELETE ON meeting_roles
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

CREATE TRIGGER role_member_signups_notify
  AFTER INSERT OR UPDATE OR DELETE ON role_member_signups
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();
```

### 7.3 Connection Pooling Strategy

```
pgx/v5 Pool Configuration:
├── MinConns:          5       (always-warm connections)
├── MaxConns:          25      (compute: num_cores × 4 for I/O-bound)
├── MaxConnLifetime:   1h      (prevent stale connections)
├── MaxConnIdleTime:   30m     (release idle connections)
├── HealthCheckPeriod: 1m      (detect dead connections)
└── One dedicated conn for LISTEN/NOTIFY (outside pool)
```

**Why not PgBouncer?** PgBouncer in transaction mode (what Supabase uses) doesn't support `LISTEN/NOTIFY` or prepared statements. Since you control everything, use `pgx` pool directly. Add PgBouncer only when you exceed 100 concurrent users.

### 7.4 Query Strategy

**No ORM.** Use raw SQL with `pgx`. ORMs add abstraction layers that obscure query plans and make it easy to generate N+1 queries accidentally.

**Use `sqlc` for type-safe query generation.** `sqlc` reads your SQL files and generates type-safe Go code. You write SQL, it generates Go functions. Best of both worlds.

```sql
-- query: ListActiveMembersByMeeting
-- file: queries/members.sql
SELECT m.id, m.name, m.email, m.active
FROM members m
WHERE m.active = true
ORDER BY m.name;
```

`sqlc` generates:

```go
func (q *Queries) ListActiveMembers(ctx context.Context) ([]Member, error)
```

**Why `sqlc`:** Write SQL, get Go. No runtime reflection. Query errors caught at compile time. SQL is readable and analyzable via `EXPLAIN ANALYZE` directly.

### 7.5 Transaction Pattern

```go
// All service methods that need transactions follow this pattern
func (s *RoleService) ClaimRole(ctx context.Context, roleID, memberID uuid.UUID) (*domain.MeetingRole, error) {
    return withTx(ctx, s.db, func(tx pgx.Tx) (*domain.MeetingRole, error) {
        role, err := s.roleRepo.LockForClaim(ctx, tx, roleID)
        if err != nil {
            return nil, err  // tx auto-rolled back by withTx on error
        }
        return s.roleRepo.Assign(ctx, tx, role.ID, memberID)
    })
}

// withTx helper (defined once, reused everywhere)
func withTx[T any](ctx context.Context, db *pgxpool.Pool, fn func(pgx.Tx) (T, error)) (T, error) {
    tx, err := db.Begin(ctx)
    if err != nil { return zero[T](), err }
    defer tx.Rollback(ctx)  // no-op if committed
    result, err := fn(tx)
    if err != nil { return zero[T](), err }
    return result, tx.Commit(ctx)
}
```

### 7.6 Analytics Query

The `get_analytics()` PL/pgSQL function is ported as a single parameterized SQL query executed via `pgx`. No stored procedure needed. The Go service executes the query, scans results into Go structs, and returns `domain.AnalyticsData`. The SQL is identical — it just runs in Go code instead of a stored procedure.

**Cache analytics:** Analytics data doesn't need to be real-time. Add a 5-minute in-memory cache (Go `sync.Map` + `time.Time` expiry). One entry, never evicted, refreshed on TTL. This eliminates the most expensive query from your hot path.

---

## 8. Authentication & Security System

### 8.1 Current vs Proposed Token Strategy

| | Supabase (GoTrue) | Custom |
|---|---|---|
| Access token lifetime | 1 hour | 15 minutes |
| Refresh token | Opaque, stored in Supabase | SHA256-hashed, stored in your DB |
| Token storage | localStorage | httpOnly cookie (preferred) or localStorage |
| Password hashing | bcrypt cost 10 | bcrypt cost 12 |
| Token rotation | No | Yes (refresh invalidates old token) |
| Revocation | Session-based | Token hash in DB |

### 8.2 JWT Claims Structure

```go
type Claims struct {
    jwt.RegisteredClaims               // sub, exp, iat, jti
    UserID   uuid.UUID  `json:"uid"`
    MemberID *uuid.UUID `json:"mid"`   // null if not linked
    ClubRole string     `json:"role"`  // "admin" | "member"
    Email    string     `json:"email"`
}
```

**Why include `MemberID` and `ClubRole` in JWT:** Every request that needs authorization currently makes 2 DB calls (GoTrue lookup + profiles lookup). With these in the JWT, authorization middleware is pure CPU — no DB roundtrip. The JWT is the source of truth for the duration of its 15-minute window.

**Security note:** When a profile is linked (member_id updated), the old JWT still has `null` for MemberID until it expires or is refreshed. Frontend must call `POST /api/auth/refresh` after linking to get a new token with the updated claims. This is a known pattern (same as how Stripe handles plan changes in JWTs).

### 8.3 Auth Endpoint Flows

```
POST /api/v1/auth/signup
  Body: { email, password, name? }
  1. Validate input (email format, password length ≥ 8)
  2. Check email not already in users
  3. bcrypt.GenerateFromPassword(password, 12)
  4. BEGIN TRANSACTION
  5. INSERT INTO users (email, password_hash) → userID
  6. INSERT INTO profiles (id) → profile row
  7. Auto-link: SELECT member_id FROM members WHERE lower(email)=lower($1)
  8. If found: UPDATE profiles SET member_id=? WHERE id=?
  9. COMMIT
  10. Issue access_token (JWT 15m) + refresh_token (random 32 bytes, SHA256 stored)
  11. Response: { access_token, user: { id, email, member_id, club_role } }

POST /api/v1/auth/login
  Body: { email, password }
  1. SELECT FROM users WHERE lower(email)=lower($1)
  2. bcrypt.CompareHashAndPassword(hash, password)
  3. SELECT profile WHERE id=userID
  4. Issue access_token + refresh_token
  5. Store refresh_token hash in refresh_tokens table
  6. Response: { access_token, user: { id, email, member_id, club_role } }

POST /api/v1/auth/refresh
  Body: { refresh_token } (or read from httpOnly cookie)
  1. SHA256(refresh_token) → hash
  2. SELECT FROM refresh_tokens WHERE token_hash=? AND revoked_at IS NULL
     AND expires_at > now()
  3. If not found → 401
  4. BEGIN TRANSACTION
  5. UPDATE refresh_tokens SET revoked_at=now() WHERE id=?  (invalidate old)
  6. INSERT new refresh_token record
  7. COMMIT
  8. Re-fetch profile (member_id may have changed since last login)
  9. Issue new access_token + new refresh_token
  10. Response: { access_token, user }

POST /api/v1/auth/logout
  1. Revoke refresh_token (mark revoked_at)
  2. 200 OK (no body)

GET /api/v1/auth/me
  1. JWT middleware validates token
  2. SELECT profile + member WHERE user_id = claims.UserID
  3. Response: { id, email, member_id, club_role, member: { name } }
```

### 8.4 Password Hash Migration

Supabase GoTrue uses bcrypt with cost 10. Your Go backend uses `golang.org/x/crypto/bcrypt`. They are 100% compatible — `bcrypt.CompareHashAndPassword` will validate Supabase-generated hashes.

**Migration SQL (one-time, run in transaction):**

```sql
-- Export from Supabase SQL editor (you have access as project owner):
-- SELECT id, email, encrypted_password, created_at FROM auth.users;

-- Import into your users table:
INSERT INTO users (id, email, password_hash, created_at)
SELECT id, email, encrypted_password, created_at
FROM auth.users
ON CONFLICT (email) DO NOTHING;
```

### 8.5 Security Hardening

**Rate limiting:** `POST /api/v1/auth/login` — 5 attempts per 15 minutes per IP. Use an in-memory sliding window (Go `sync.Map` + goroutine cleanup). For production: Redis-backed rate limiter.

**CORS:** Only allow your frontend domain. Never `*` in production.

```go
cors.Handler(cors.Options{
    AllowedOrigins:   []string{"https://yourdomain.com"},
    AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"Authorization", "Content-Type"},
    AllowCredentials: true,  // needed for cookies
    MaxAge:           86400,
})
```

**Input sanitization:** All handler inputs go through a validator (`go-playground/validator/v10`):

```go
type LoginRequest struct {
    Email    string `json:"email"    validate:"required,email,max=255"`
    Password string `json:"password" validate:"required,min=8,max=72"`
}
```

**HTTPS only in production.** Terminate TLS at load balancer or Caddy. Never run Go backend with plain HTTP in production.

**`jti` claim in JWT.** Include a unique JWT ID in every access token. For critical endpoints, check `jti` hasn't been revoked in a small Redis/in-memory blocklist. The 15-minute TTL limits the blast radius of a stolen token.

---

## 9. REST API Design

### 9.1 API Design Principles

**Versioned from day one.** All endpoints under `/api/v1/`. When you need breaking changes: `/api/v2/`. Never deprecate without a version bump.

**Consistent response envelope:**

```json
// Success
{ "data": { ... }, "meta": { "request_id": "..." } }

// List with pagination
{ "data": [...], "meta": { "total": 42, "page": 1, "per_page": 20 } }

// Error
{ "error": { "code": "ROLE_UNAVAILABLE", "message": "Role is no longer available" }, "meta": { "request_id": "..." } }
```

**Machine-readable error codes.** The `code` field lets the frontend handle errors programmatically.

**HTTP status codes used correctly:**
- `200` — success with body
- `201` — created
- `204` — success, no body (DELETE)
- `400` — bad request (validation failure)
- `401` — unauthenticated (no/invalid token)
- `403` — authorized but forbidden (wrong role)
- `404` — not found
- `409` — conflict (e.g., race on role claim)
- `422` — unprocessable entity (business rule violation)
- `429` — rate limited
- `500` — internal server error (never expose details)

### 9.2 Complete Endpoint Inventory

```
Auth (public)
  POST   /api/v1/auth/signup
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/logout              [auth required]
  GET    /api/v1/auth/me                  [auth required]

Profiles
  GET    /api/v1/profile                  [auth required]
  PUT    /api/v1/profile                  [auth required]
  POST   /api/v1/profile/link             [auth required]

Members
  GET    /api/v1/members                  [auth required]
  POST   /api/v1/members                  [admin required]
  GET    /api/v1/members/{id}             [auth + self or admin]
  PUT    /api/v1/members/{id}             [admin required]
  DELETE /api/v1/members/{id}             [admin required]

Meetings
  GET    /api/v1/meetings                 [auth required]
  POST   /api/v1/meetings                 [admin required]
  GET    /api/v1/meetings/{id}            [auth required]
  PUT    /api/v1/meetings/{id}            [admin required]
  DELETE /api/v1/meetings/{id}            [admin required]

Meeting Roles
  GET    /api/v1/meetings/{id}/roles           [auth required]
  POST   /api/v1/meetings/{id}/roles           [admin required]
  PUT    /api/v1/meeting-roles/{id}            [admin required]
  DELETE /api/v1/meeting-roles/{id}            [admin required]
  PUT    /api/v1/meeting-roles/{id}/signup-open [admin required]
  POST   /api/v1/meeting-roles/{id}/claim      [auth + linked]
  POST   /api/v1/meeting-roles/{id}/unclaim    [auth + linked]

Role Signups
  GET    /api/v1/meetings/{id}/signups         [auth required]
  POST   /api/v1/meetings/{id}/signups         [auth + linked]
  DELETE /api/v1/meetings/{id}/signups/{roleId} [auth + linked]

Speeches
  GET    /api/v1/meetings/{id}/speeches        [auth required]
  POST   /api/v1/meetings/{id}/speeches        [auth required]
  PUT    /api/v1/speeches/{id}                 [auth + role holder or admin]
  DELETE /api/v1/speeches/{id}                 [admin required]

Speech Comments
  GET    /api/v1/speeches/{id}/comments        [auth required]
  POST   /api/v1/speeches/{id}/comments        [auth + linked]
  DELETE /api/v1/speech-comments/{id}          [auth + own or admin]

Reports
  PUT    /api/v1/reports/grammarian/{roleId}          [auth + role holder]
  PUT    /api/v1/reports/evaluator/{roleId}           [auth + role holder]
  PUT    /api/v1/reports/timer/{roleId}               [auth + role holder]
  PUT    /api/v1/reports/ah-counter/{meetingId}/{speakerId} [auth + role holder]

Votes
  GET    /api/v1/meetings/{id}/votes           [auth required]
  POST   /api/v1/meetings/{id}/votes           [auth + linked]

Roles (static lookup)
  GET    /api/v1/roles                         [auth required]

Analytics
  GET    /api/v1/analytics                     [auth required]

Health (public)
  GET    /health
  GET    /ready                                (DB connectivity check)

WebSocket
  GET    /ws?meeting={id}                      [auth via query param token]
```

### 9.3 Pagination Standard

All list endpoints support:

```
GET /api/v1/members?page=1&per_page=20&sort=name&order=asc
```

Response:

```json
{
  "data": [...],
  "meta": {
    "total": 47,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

**Cursor-based pagination** for large tables (future): use `?after_id=<uuid>` instead of `OFFSET` — `OFFSET` causes sequential scans at high page numbers.

---

## 10. Realtime WebSocket Architecture

### 10.1 Current vs Custom

| | Supabase Realtime | Custom |
|---|---|---|
| Transport | WebSocket over Supabase multiplayer | WebSocket over your server |
| Change detection | Supabase CDC (Postgres WAL) | `pg_notify` from DB trigger |
| Subscription model | Channel per table+filter | Channel per `meeting_id` |
| Reconnect | Handled by SDK | Handle in frontend client |
| Auth | JWT from Supabase session | JWT as query param on WS URL |

### 10.2 Go Hub Architecture

```go
// The hub is the central broker
type Hub struct {
    rooms      map[string]map[*Client]bool  // meetingID → set of clients
    register   chan *Client
    unregister chan *Client
    broadcast  chan Message
    mu         sync.RWMutex
}

// One goroutine runs the hub (never shared data directly)
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.addClient(client)
        case client := <-h.unregister:
            h.removeClient(client)
        case msg := <-h.broadcast:
            h.broadcastToRoom(msg.RoomID, msg.Payload)
        }
    }
}

// Separate goroutine: listens to PostgreSQL LISTEN/NOTIFY
func (l *Listener) Listen(ctx context.Context, hub *Hub) {
    conn, _ := pgx.Connect(ctx, dsn)  // dedicated connection, not from pool
    conn.Exec(ctx, "LISTEN meeting_roles_changed")
    conn.Exec(ctx, "LISTEN role_member_signups_changed")

    for {
        notification, err := conn.WaitForNotification(ctx)
        if err != nil { /* reconnect logic */ continue }

        var payload NotifyPayload
        json.Unmarshal([]byte(notification.Payload), &payload)

        hub.broadcast <- Message{
            RoomID:  payload.MeetingID,
            Payload: []byte(`{"type":"invalidate","table":"` + notification.Channel + `"}`),
        }
    }
}
```

### 10.3 Client (WebSocket connection)

Each connected browser gets a `*Client`:

```go
type Client struct {
    hub       *Hub
    conn      *websocket.Conn
    send      chan []byte   // buffered channel (256 messages)
    meetingID string
    userID    uuid.UUID
}

// Two goroutines per client: readPump and writePump
func (c *Client) readPump()  // handles ping/pong, disconnect detection
func (c *Client) writePump() // drains c.send channel, writes to websocket
```

**Ping/pong heartbeat:** Every 30s, server pings. Client must pong within 10s or connection is closed. This detects dead connections that TCP didn't catch (mobile network switches, etc.).

### 10.4 Frontend WebSocket Client

```typescript
// src/lib/wsClient.ts
class MeetingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxDelay = 30000;

  connect(meetingId: string, token: string, onInvalidate: (table: string) => void) {
    this.ws = new WebSocket(`${WS_URL}/ws?meeting=${meetingId}&token=${token}`);

    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'invalidate') onInvalidate(msg.table);
    };

    this.ws.onclose = () => {
      // Exponential backoff reconnect
      setTimeout(() => this.connect(meetingId, token, onInvalidate), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    };

    this.ws.onopen = () => { this.reconnectDelay = 1000; };
  }
}
```

### 10.5 WebSocket Auth

JWTs can't be sent in `Authorization` headers during WebSocket upgrade (browser limitation). Options:

1. **Query param:** `wss://api/ws?token=<jwt>` — simple, but JWT visible in server logs. Mitigate with short-lived (30s) one-time WS ticket tokens.
2. **Cookie:** If frontend uses httpOnly cookies for JWT, browser sends it automatically on WS upgrade.
3. **WS ticket:** Frontend calls `POST /api/v1/ws-ticket` → gets a 30-second single-use opaque token → connects WS with ticket. Best security.

**Recommendation:** WS ticket pattern for production. Query param is fine during development.

---

## 11. Business Logic Layer (RPC Replacement)

All 5 RPC functions are ported to Go service methods. The logic is identical but lives in your code, not in stored procedures.

### 11.1 ClaimRole — Race-Safe

```
Service: RoleService.ClaimRole(ctx, meetingRoleID, memberID)
  1. Begin transaction
  2. SELECT * FROM meeting_roles
     WHERE id = $1 AND member_id IS NULL AND signup_open = true
     FOR UPDATE SKIP LOCKED
  3. If 0 rows → return ErrConflict("Role is no longer available")
  4. UPDATE meeting_roles SET member_id=$2, status='assigned' WHERE id=$1
  5. Commit
  Return: updated MeetingRole
```

### 11.2 SignupForRole — Business Rule Enforcement

```
Service: SignupService.Signup(ctx, meetingID, roleID, memberID)
  Precondition checks (without transaction):
  1. SELECT status FROM meetings WHERE id = $1
     → if status != 'upcoming' → ErrBadRequest("Meeting is not upcoming")
  2. SELECT COUNT(*) FROM role_member_signups
     WHERE meeting_id=$1 AND member_id=$3
     → if > 0 → ErrConflict("Already signed up for a role in this meeting")
  3. SELECT signup_open FROM meeting_roles
     WHERE meeting_id=$1 AND role_id=$2
     → if !signup_open → ErrBadRequest("Signups not open for this role")

  In transaction:
  4. INSERT INTO role_member_signups (meeting_id, role_id, member_id)
  5. Commit
```

### 11.3 GetAnalytics — Query Port

The analytics PL/pgSQL function is ported as a single SQL query executed by Go. The SQL logic is identical. The result is cached for 5 minutes in-memory to eliminate the most expensive query from your hot path.

---

## 12. Authorization — From RLS to Middleware

### 12.1 Current RLS Model

Supabase RLS runs authorization inside PostgreSQL on every query. The policies use `auth.uid()` and helper functions. This is powerful but invisible to application code, hard to test, hard to debug (silent empty results), and adds DB overhead per query.

### 12.2 Custom Middleware Model

```
Request → JWT Middleware (parses token, injects Claims) → Route Handler
                                     ↓
                          Authorization Middleware
                          (reads Claims from context)
                                     ↓
                          Handler calls Service
                                     ↓
                     Service enforces record-level rules
```

### 12.3 Three Tiers of Authorization

**Tier 1 — Middleware (route level):**
- `RequireAuth`: JWT must be present and valid
- `RequireLinked`: `claims.MemberID != nil`
- `RequireAdmin`: `claims.ClubRole == "admin"`

**Tier 2 — Handler (request level):**
- `MemberSelfOrAdmin`: checks `chi.URLParam(r, "id") == claims.MemberID.String() || isAdmin`

**Tier 3 — Service (record level):**
- Can user edit this specific speech comment? (ownership check via DB query)
- Can user unclaim this role? (they must be the current holder)

### 12.4 Authorization Matrix

| Resource | List | Read | Create | Update | Delete |
|---|---|---|---|---|---|
| members | auth | auth+self/admin | admin | admin | admin |
| meetings | auth | auth | admin | admin | admin |
| meeting_roles | auth | auth | admin | admin | admin |
| claim/unclaim role | — | — | auth+linked | — | — |
| role_signups | auth | auth | auth+linked | — | auth+linked+own |
| speeches | auth | auth | auth+linked | auth+role_holder/admin | admin |
| speech_comments | auth | auth | auth+linked | auth+own | auth+own/admin |
| reports | auth | auth | auth+role_holder | auth+role_holder | admin |
| votes | auth | auth | auth+linked | — | — |
| analytics | auth | auth | — | — | — |
| profiles | — | auth+own | — | auth+own | — |

### 12.5 Why This Is Better Than RLS

1. **Testable:** Write a test for `RequireAdmin`, run it. Testing RLS requires a connected Supabase instance.
2. **Debuggable:** When authorization fails, you get a log line with the user ID, the resource, and the rule that failed.
3. **Observable:** You can count authorization failures in your metrics.
4. **Maintainable:** All authorization lives in one place (`internal/middleware/`), not scattered across 20+ SQL policies.

---

## 13. Frontend Migration

### 13.1 What Changes on the Frontend

The frontend needs one **API client module** to replace `@supabase/supabase-js`. Everything else (TanStack Query, React Router, Tailwind, hooks structure) stays.

### 13.2 New API Client

```typescript
// src/lib/api.ts — replaces src/lib/supabase.ts
class ApiClient {
  private baseURL = import.meta.env.VITE_API_URL;
  private accessToken: string | null = null;

  setToken(token: string | null) { this.accessToken = token; }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err.error?.code, err.error?.message);
    }
    return res.json().then(r => r.data);
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }
  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }
  delete(path: string) { return this.request(path, { method: 'DELETE' }); }
}

export const api = new ApiClient();
```

### 13.3 AuthProvider Migration

New flow replaces Supabase SDK entirely:
1. On mount: read `access_token` from localStorage
2. If found: call `GET /api/v1/auth/me` to validate and get user
3. If `/me` returns 401: call `POST /api/v1/auth/refresh` with refresh_token
4. If refresh fails: clear tokens, user is logged out
5. Set up proactive token refresh 2 minutes before expiry

### 13.4 Hook Migration Pattern

```typescript
// Before (supabase)
const { data, error } = await supabase
  .from('members').select('*').eq('active', true);

// After (custom api)
const data = await api.get<Member[]>('/api/v1/members?active=true');
```

### 13.5 Realtime Hook Migration

```typescript
function useOpenMeetingRoles(meetingId: string) {
  const queryClient = useQueryClient();
  const token = useAccessToken();

  const query = useQuery({
    queryKey: ['open_meeting_roles', meetingId],
    queryFn: () => api.get(`/api/v1/meetings/${meetingId}/roles`),
    enabled: !!meetingId,
  });

  useEffect(() => {
    if (!meetingId || !token) return;
    const ws = new MeetingWebSocket();
    ws.connect(meetingId, token, (table) => {
      if (table === 'meeting_roles_changed') {
        queryClient.invalidateQueries({ queryKey: ['open_meeting_roles', meetingId] });
      }
    });
    return () => ws.disconnect();
  }, [meetingId, token, queryClient]);

  return query;
}
```

### 13.6 Environment Variables

```bash
# Before
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# After
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

### 13.7 Token Refresh — Automatic Silent Refresh

When two simultaneous requests both receive a 401 (token expired), only one should trigger the refresh. Implement a mutex/promise-based refresh lock in the API client. The first request to 401 acquires the lock and refreshes. Subsequent 401s wait for the lock to release and use the new token.

Schedule proactive refresh when token has 2 minutes left:

```typescript
const expiresIn = jwtPayload.exp * 1000 - Date.now();
const refreshAt = expiresIn - 2 * 60 * 1000;
setTimeout(refreshToken, Math.max(refreshAt, 0));
```

---

## 14. Test Strategy & Scope

### 14.1 Testing Philosophy

**Principle:** Test behavior, not implementation. Tests should break when behavior changes, not when you rename a variable.

**TDD for service layer.** Write the test first for every service method. This forces you to define the interface before the implementation.

**No mocking the database in integration tests.** Use `testcontainers-go` to spin up a real PostgreSQL instance. Tests that mock the DB don't catch query bugs, index misuse, or constraint violations.

### 14.2 Test Pyramid

```
         ┌─────────────────────────┐
         │      E2E Tests          │  ~10-20 flows
         │  (Playwright, browser)  │  Slowest, highest confidence
         ├─────────────────────────┤
         │  Integration Tests      │  ~80-120 tests
         │  (real DB, httptest)    │  Medium speed
         ├─────────────────────────┤
         │    Unit Tests           │  ~100-150 tests
         │  (services, pure logic) │  Fast, no I/O
         └─────────────────────────┘
```

### 14.3 Unit Test Scope (Service Layer)

**AuthService:**
- Signup with valid credentials creates user + profile + auto-links by email if member exists
- Signup with duplicate email returns `ErrConflict`
- Signup with short password returns `ErrBadRequest`
- Login with correct credentials returns access token + refresh token
- Login with wrong password returns `ErrUnauthorized`
- Login with non-existent email returns `ErrUnauthorized` (same message — no email enumeration)
- Refresh with valid token returns new tokens and revokes old
- Refresh with expired token returns `ErrUnauthorized`
- Refresh with revoked token returns `ErrUnauthorized`
- Logout revokes refresh token
- Token claims contain correct `MemberID` after profile link

**RoleService:**
- ClaimRole on available role assigns it and returns updated row
- ClaimRole on already-claimed role returns `ErrConflict`
- ClaimRole on role with `signup_open=false` returns `ErrConflict`
- ClaimRole by user without linked member returns `ErrForbidden`
- UnclaimRole by holder removes assignment
- UnclaimRole by non-holder returns `ErrForbidden`
- Concurrent claims: only one succeeds (requires DB test)
- ToggleSignupOpen updates flag

**SignupService:**
- Signup for open role in upcoming meeting succeeds
- Signup for role in non-upcoming meeting returns `ErrBadRequest`
- Signup when already signed up for another role in same meeting returns `ErrConflict`
- Signup for closed role returns `ErrBadRequest`
- Withdraw removes signup record
- Withdraw for role not signed up for returns `ErrNotFound`

**ReportService:**
- Upsert grammarian report creates new record
- Upsert grammarian report with existing record updates in place
- Upsert by non-role-holder returns `ErrForbidden`
- All four report types follow same upsert pattern

**VoteService:**
- First vote in category is created
- Second vote by same user in same category updates the existing vote
- Invalid category returns `ErrBadRequest`
- Vote by unlinked user returns `ErrForbidden`

**AnalyticsService:**
- Returns correct aggregated data structure
- Cached result is returned within TTL
- Cache is refreshed after TTL expires

### 14.4 Integration Test Scope (Handler + Real DB)

**Setup:** Each test file uses `testcontainers-go` to start a PostgreSQL container, runs all migrations, and seeds minimal data. Tests run in parallel using separate DB schemas per test.

**Auth Endpoints:**
- `POST /auth/signup` → 201 with access_token
- `POST /auth/signup` duplicate email → 409
- `POST /auth/login` valid → 200 with tokens
- `POST /auth/login` wrong password → 401
- `POST /auth/refresh` valid → 200 new tokens, old revoked
- `POST /auth/logout` → 200, token revoked
- `GET /auth/me` with valid token → 200 user object
- `GET /auth/me` without token → 401
- `GET /auth/me` with expired token → 401

**Members Endpoints:**
- `GET /members` as auth user → 200 list
- `GET /members` without token → 401
- `POST /members` as admin → 201
- `POST /members` as non-admin → 403
- `GET /members/{id}` as self → 200
- `GET /members/{id}` as other non-admin → 403
- `PUT /members/{id}` as admin → 200
- `DELETE /members/{id}` as admin → 204

**Meeting Role Flows (Critical):**
- `POST /meeting-roles/{id}/claim` on available role → 200
- `POST /meeting-roles/{id}/claim` on claimed role → 409
- `POST /meeting-roles/{id}/claim` without linked profile → 403
- `POST /meeting-roles/{id}/unclaim` by holder → 200
- `POST /meeting-roles/{id}/unclaim` by non-holder → 403
- Concurrent claim test: two requests simultaneously → exactly one 200, one 409

**Report Endpoints:**
- `PUT /reports/grammarian/{roleId}` by role holder → 200 (create)
- `PUT /reports/grammarian/{roleId}` again by holder → 200 (update, same record)
- `PUT /reports/grammarian/{roleId}` by non-holder → 403

**Middleware Tests:**
- Request without token → 401 on all protected routes
- Request with malformed token → 401
- Request with expired token → 401
- Request with admin token on admin-only route → passes
- Request with member token on admin-only route → 403
- Rate limit: 6 login attempts in 1 minute → 6th returns 429

### 14.5 Concurrency Test Scope

These tests are critical and often skipped. Run them in integration test suite with real DB.

- 10 goroutines all attempt to claim the same role simultaneously → exactly 1 succeeds
- 10 goroutines all attempt to signup for same (single-slot) role → exactly 1 succeeds
- Vote upsert: 2 concurrent votes for same user/meeting/category → only 1 row exists after

### 14.6 WebSocket Test Scope

- Client connects with valid JWT → receives welcome acknowledgment
- Client connects with invalid JWT → connection rejected (close code 4001)
- DB trigger fires → connected client receives `invalidate` message within 200ms
- Client disconnects → hub removes client (no leak)
- 100 clients connected to same meeting_id → all receive broadcast
- Client reconnects after server drop → receives missed events via HTTP refresh

### 14.7 E2E Test Scope (Playwright)

**Critical flows:**
1. Sign up → auto-link to member → land on dashboard
2. Log in → view meetings list → open meeting detail
3. Open role signup → claim role → see role reflected for another user (realtime)
4. Log in as admin → create meeting → add roles → toggle signup open
5. Submit grammarian report → view updated score in meeting detail
6. Vote for best speaker → change vote → only latest vote counted
7. View analytics page → all charts render with data
8. Log out → protected routes redirect to login
9. Session expires → silent token refresh → user stays logged in
10. Offline mode → cached data shown → online → data refreshes

### 14.8 Performance Test Scope

Before launch:
- `k6` load test: 50 concurrent users all reading meetings list → p99 < 100ms
- `k6` load test: 20 concurrent role claim attempts → correct concurrency behavior
- WebSocket: 200 simultaneous WS connections → memory under 50MB, no goroutine leak
- Analytics endpoint: response time < 500ms with 1,000 meetings in DB

---

## 15. Development Best Practices

### 15.1 Git Workflow

**Branch strategy: GitHub Flow** (simpler than GitFlow for a small team):
- `main` — always deployable
- `feat/short-description` — feature branches, PR to main
- Never commit directly to main
- Squash merge for clean history

**Commit message convention (Conventional Commits):**

```
feat(auth): add refresh token rotation
fix(roles): handle concurrent claim edge case
test(auth): add integration tests for login flow
refactor(db): extract common transaction helper
docs(api): document all endpoint contracts
```

This enables automatic changelog generation and semantic versioning.

### 15.2 TDD Cycle for This Project

For service layer (pure business logic):

```
1. Write failing test for desired behavior
2. Write minimal code to pass the test
3. Refactor (extract helpers, clean up)
4. Repeat
```

For HTTP handlers: write integration test first (HTTP request → expected response), then implement the handler. This is **outside-in TDD**.

For repositories: integration test with real DB → implement SQL.

**Don't TDD:**
- The `main.go` wiring
- Logging setup
- DB connection initialization
- Config loading

These are too infrastructure-heavy and rarely change behavior in ways that break tests.

### 15.3 Code Review Checklist

Every PR must verify:
- [ ] No new business logic in handlers (handlers are thin)
- [ ] All DB queries use parameterized inputs (no string formatting into SQL)
- [ ] Errors are checked, not ignored
- [ ] Goroutines have clear lifetime management (context cancellation or explicit stop)
- [ ] New endpoints have tests covering at least: happy path, unauthenticated, unauthorized
- [ ] No secrets in code or logs
- [ ] New DB queries have `EXPLAIN ANALYZE` run and reviewed

### 15.4 Makefile Targets

```makefile
make dev        # Start hot-reloading server (air)
make test       # Run unit tests
make test-int   # Run integration tests (requires Docker)
make test-all   # Run all tests
make lint       # golangci-lint
make build      # Build binary
make migrate    # Run pending migrations
make migrate-down  # Rollback last migration
make generate   # Run sqlc generate
make coverage   # Generate coverage report (threshold: 80%)
```

### 15.5 Environment Management

```bash
# .env.example — committed to repo
DATABASE_URL=postgres://user:password@localhost:5432/toastmasters?sslmode=disable
JWT_SECRET=change-me-in-production-minimum-32-chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=168h      # 7 days
SERVER_PORT=8080
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
LOG_LEVEL=debug           # debug | info | warn | error
RATE_LIMIT_ENABLED=false  # true in production
ANALYTICS_CACHE_TTL=5m
```

Never use `os.Getenv` directly in handlers. Parse all config on startup into a `Config` struct. Validate required fields. If a required env var is missing, crash loudly on startup — better than cryptic failure at runtime.

### 15.6 Code Generation

- **`sqlc`** — generates type-safe Go from SQL. Run `make generate` after adding a query.
- **`oapi-codegen`** — optionally generate server stubs from OpenAPI spec. Enforces API contract.

### 15.7 Hot Reload in Development

Use `air` (Go hot reloader):

```toml
# .air.toml
[build]
cmd = "go build -o ./tmp/main ./cmd/server"
bin = "./tmp/main"
[watch]
include_ext = ["go", "sql"]
exclude_dir = ["vendor", "tmp", "testdata"]
```

---

## 16. Observability, Logging & Monitoring

### 16.1 Structured Logging (Zap)

Every log line is JSON. No `fmt.Println`. Every request log includes:

```json
{
  "ts": "2026-06-05T10:23:11Z",
  "level": "info",
  "msg": "request",
  "request_id": "01J3X...",
  "method": "POST",
  "path": "/api/v1/meeting-roles/abc/claim",
  "status": 200,
  "duration_ms": 12,
  "user_id": "uuid...",
  "member_id": "uuid..."
}
```

**Log levels:**
- `debug` — detailed flow tracing (dev only)
- `info` — all HTTP requests, startup/shutdown
- `warn` — recoverable anomalies (retry succeeded, cache miss)
- `error` — business errors, DB errors
- `fatal` — startup failures only

### 16.2 Request Tracing (OpenTelemetry)

Add `otel` for distributed tracing. Even without a collector on day 1, the code is instrumented. When you add Jaeger/Tempo later, tracing appears automatically.

Each request gets a trace with spans for:
- HTTP handler
- DB query (auto-instrumented by `pgx otel` plugin)
- Business logic call

Trace ID is also the `X-Request-ID` header — correlates browser logs to server logs.

### 16.3 Metrics (Prometheus)

Expose `/metrics` endpoint. Instrument:
- `http_requests_total` — by method, path, status
- `http_request_duration_seconds` — histogram by path
- `db_query_duration_seconds` — histogram by query name
- `ws_connections_active` — gauge
- `ws_messages_sent_total` — counter
- `role_claims_total` — by result (success/conflict)
- `analytics_cache_hits_total`
- `token_refresh_total`

### 16.4 Health Checks

```
GET /health   → { "status": "ok" }          — always 200 (server is alive)
GET /ready    → { "status": "ok",           — 200 or 503
                  "db": "ok",
                  "listener": "ok" }
```

`/ready` checks DB connectivity and the listener goroutine. Load balancers use `/ready` before sending traffic.

### 16.5 Alerts to Configure

| Condition | Severity |
|---|---|
| p99 latency > 500ms for 5 min | Warning |
| Error rate > 5% for 2 min | Critical |
| DB connection pool saturation > 80% | Warning |
| WS connections > 500 | Warning |
| Refresh token failure rate > 10% | Warning |
| `/ready` returns 503 | Critical |

---

## 17. Scalability Design

### 17.1 Scale Targets

| Horizon | Users | Concurrent | Infra |
|---|---|---|---|
| Today | ~50 | ~20 | 1 VPS, 512MB |
| 6 months | ~200 | ~80 | 1 VPS, 1GB |
| Multi-club SaaS | ~5,000 | ~500 | 2 app servers + managed DB |
| Regional SaaS | ~50,000 | ~5,000 | Kubernetes + read replicas + Redis |

### 17.2 Stateless Server Design

The Go server must be stateless. No in-process session state. JWTs carry auth state. Refresh tokens are in PostgreSQL. If you need caching (analytics TTL), use Redis — not in-memory `sync.Map` — once you run 2+ instances.

**Exception:** The WebSocket hub is stateful. For multi-instance deployment, WS connections for a given meeting must go to the same instance (sticky sessions), or use Redis Pub/Sub to fan out across instances.

### 17.3 Database Scalability

**Today:** Single primary PostgreSQL.

**Phase 2 (multi-club):**
- Add PgBouncer in transaction mode between app and DB
- Move to managed PostgreSQL (Neon, Supabase DB-only, RDS) for automated failover
- Separate read replicas for analytics queries

**Phase 3 (SaaS):**
- Tenant isolation: row-level `club_id` column
- Read replica for analytics (`GET /analytics` routed to replica)
- Write-ahead log archiving for point-in-time recovery

**Connection math for today:**

```
25 pool connections × 1 app server = 25 DB connections
PostgreSQL default max_connections = 100
Headroom: 75 connections for migrations, admin, monitoring
```

### 17.4 Caching Strategy

**Layer 1 — Frontend:** TanStack Query with 5-minute stale time + localStorage persistence. Already in place.

**Layer 2 — Application:**
- Analytics: 5-minute in-memory TTL (move to Redis when multi-instance)
- Roles lookup: Static data (7 role types never changes). Cache forever, bust on deployment.

**Layer 3 — Database:** PostgreSQL shared_buffers caches hot pages automatically.

### 17.5 WebSocket Scalability

**Single instance:** The Go hub handles 10,000+ concurrent connections.

**Multi-instance:**
1. **Sticky sessions** on load balancer (simplest): Route by IP hash.
2. **Redis Pub/Sub**: Each instance subscribes to Redis topic for meeting_id. DB trigger publishes to Redis; all instances receive and fan-out to their local clients.

### 17.6 Multi-Tenant Design (Future)

**Row-level tenant_id (recommended for your scale):**

```sql
ALTER TABLE meetings ADD COLUMN club_id UUID NOT NULL REFERENCES clubs(id);
-- All queries: WHERE club_id = $1
-- JWT claims include club_id
```

Pro: Single schema, simple migrations. Con: Shared DB means one slow query can impact all tenants — mitigate with per-tenant connection limits.

---

## 18. CI/CD Pipeline

### 18.1 Pipeline Stages

```
Push to feat/* branch:
  └── PR CI (.github/workflows/ci.yml)
        ├── golangci-lint (code quality)
        ├── go vet (static analysis)
        ├── go test ./... -race (unit tests + race detector)
        ├── go test -tags=integration (integration tests via testcontainers)
        └── go build (verify compilation)

Merge to main:
  └── Deploy (.github/workflows/deploy.yml)
        ├── Run all tests
        ├── docker build (multi-stage)
        ├── docker push to registry
        ├── Run DB migrations (via migrate tool)
        └── Deploy to server (SSH + docker-compose pull + up -d)
```

### 18.2 Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server

# Stage 2: Runtime (distroless)
FROM gcr.io/distroless/static:nonroot
COPY --from=builder /app/server /server
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
```

Result: ~10MB Docker image. Compare to Node.js + node:alpine at ~150MB.

### 18.3 Database Migration in CI/CD

**Never run migrations on deploy.** Run them as a separate pre-deploy step:

```yaml
- name: Migrate
  run: ./migrate -database "$DATABASE_URL" -path ./migrations up
- name: Deploy
  run: # deploy only after migrate succeeds
```

If migration fails, old code still runs. Rollback is possible.

### 18.4 Semantic Versioning

Use `release-please` (GitHub Action) or `semantic-release`. Conventional Commit messages automatically bump version:
- `feat:` → minor bump (1.x.0)
- `fix:` → patch bump (1.0.x)
- `feat!:` → major bump (x.0.0)

---

## 19. Deployment Architecture

### 19.1 Development

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: toastmasters
      POSTGRES_PASSWORD: dev
    ports: ["5432:5432"]
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d

  backend:
    build: .
    env_file: .env
    ports: ["8080:8080"]
    depends_on: [postgres]
    develop:
      watch:
        - action: rebuild
          path: ./cmd
        - action: rebuild
          path: ./internal
```

### 19.2 Production (Day 1 — Single VPS)

```
DNS: yourdomain.com → VPS IP
     api.yourdomain.com → VPS IP

VPS (Hetzner CX21 or similar, €5/month):
├── Caddy (reverse proxy + automatic HTTPS)
│   ├── yourdomain.com → frontend static files (or proxy to Vercel/Netlify)
│   └── api.yourdomain.com → localhost:8080
├── Go backend (systemd service or docker container)
├── PostgreSQL (Docker container or managed Neon/Supabase DB)
└── Fail2ban (block brute force on SSH)
```

Caddy handles TLS certificate issuance/renewal automatically via Let's Encrypt. No Nginx config, no Certbot cron job.

### 19.3 Production (Phase 2 — Two Servers)

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                    ┌────────┴────────┐
          ┌─────────▼──────┐ ┌────────▼──────┐
          │  Go Server 1   │ │  Go Server 2  │
          │  (app + ws)    │ │  (app + ws)   │
          └─────────┬──────┘ └────────┬──────┘
                    └────────┬────────┘
                    ┌────────▼────────┐
                    │  PostgreSQL     │
                    └─────────────────┘
                    ┌─────────────────┐
                    │  Redis          │
                    │  (rate limit,   │
                    │   WS pub/sub)   │
                    └─────────────────┘
```

---

## 20. Migration Execution Plan — Phase by Phase

### Phase 0: Infrastructure Setup (Days 1–2)

- [ ] Initialize Go module: `go mod init github.com/yourname/toastmasters-backend`
- [ ] Set up project directory structure per Section 6.1
- [ ] Install dependencies: `chi`, `pgx/v5`, `golang-jwt`, `bcrypt`, `zap`, `otel`, `gorilla/websocket`, `testcontainers-go`
- [ ] Set up `docker-compose.yml` with PostgreSQL
- [ ] Copy existing SQL migrations to `backend/migrations/`
- [ ] Add new migrations: `users` table, `refresh_tokens` table, modify `profiles` FK
- [ ] Add `pg_notify` triggers for `meeting_roles` and `role_member_signups`
- [ ] Write `Config` struct and `.env.example`
- [ ] Write health check endpoints `GET /health` and `GET /ready`
- [ ] Set up `Makefile`
- [ ] Set up `golangci-lint` with `.golangci.yml`
- [ ] Set up GitHub Actions CI (lint + build only, tests come later)

**Deliverable:** Server starts, connects to DB, health checks pass. No business logic yet.

### Phase 1: Authentication (Days 3–7)

- [ ] Write `pkg/token/jwt.go` (sign + parse)
- [ ] Write `pkg/crypto/password.go` (bcrypt hash + compare)
- [ ] Write `internal/repository/auth_repo.go`
- [ ] Write `internal/service/auth_service.go` (signup, login, refresh, logout)
- [ ] Write `internal/transport/http/auth_handler.go`
- [ ] Write `internal/middleware/auth.go` (JWT validation middleware)
- [ ] Write unit tests for AuthService
- [ ] Write integration tests for all auth endpoints
- [ ] Write migration script to import `auth.users` → your `users` table
- [ ] Write `internal/repository/profile_repo.go` + ProfileService + handler
- [ ] Test: login, refresh, `/me` endpoint

**Deliverable:** Full auth flow working. Existing Supabase users can log in with their existing passwords.

### Phase 2: Core CRUD API (Days 8–15)

One domain at a time. For each: domain types → repository → service → handler → tests.

- [ ] Members (all 5 endpoints)
- [ ] Meetings (all 5 endpoints)
- [ ] Roles lookup (1 endpoint, static)
- [ ] Meeting Roles (CRUD + toggle signup_open)
- [ ] Speeches (CRUD)
- [ ] Speech Comments (CRUD)
- [ ] Role Signups (CRUD)
- [ ] Votes (upsert)
- [ ] Reports: Grammarian, Evaluator, Timer, Ah-Counter (upsert each)

**Deliverable:** All PostgREST endpoints replaced. Frontend can be switched per endpoint.

### Phase 3: Business Logic (Days 14–17)

- [ ] `POST /meeting-roles/{id}/claim` — race-safe with `FOR UPDATE SKIP LOCKED`
- [ ] `POST /meeting-roles/{id}/unclaim`
- [ ] `POST /meetings/{id}/signups` — with all precondition checks
- [ ] `DELETE /meetings/{id}/signups/{roleId}`
- [ ] `GET /analytics` — port PL/pgSQL function to Go + SQL + 5-min cache
- [ ] `POST /profile/link` — manual profile-to-member link
- [ ] Concurrency tests for claim/signup

**Deliverable:** All 5 RPC functions replaced. Business logic fully in Go.

### Phase 4: Realtime WebSocket (Days 18–21)

- [ ] Write `pg_notify` triggers (migration)
- [ ] Write `internal/transport/ws/hub.go`
- [ ] Write `internal/transport/ws/client.go`
- [ ] Write `internal/transport/ws/handler.go` (upgrade + JWT auth)
- [ ] Write listener goroutine
- [ ] Wire hub into server
- [ ] WebSocket integration tests
- [ ] Frontend: `src/lib/wsClient.ts`
- [ ] Frontend: update `useOpenMeetingRoles` and `useRoleSignups` to use WS client

**Deliverable:** Realtime updates working without Supabase.

### Phase 5: Frontend Migration (Days 20–24)

- [ ] Write `src/lib/api.ts` (fetch wrapper with auth, error types)
- [ ] Rewrite `src/app/AuthProvider.tsx` (custom JWT, silent refresh, session restore)
- [ ] Migrate hooks one by one (each hook's `supabase.*` → `api.*`)
- [ ] Update env vars in Vite config
- [ ] Test all pages manually against custom backend
- [ ] Run Playwright E2E suite

**Deliverable:** Frontend fully decoupled from Supabase SDK.

### Phase 6: Cutover (Days 25–28)

- [ ] Remove RLS policies from PostgreSQL
- [ ] Remove Supabase helper functions
- [ ] Remove `@supabase/supabase-js` from package.json
- [ ] Remove `@supabase/ssr` from package.json
- [ ] Remove `VITE_SUPABASE_*` env vars
- [ ] Deploy Go backend to production VPS
- [ ] Run auth migration script
- [ ] DNS cutover: `api.yourdomain.com` → Go server
- [ ] Monitor error rates for 48 hours
- [ ] Delete Supabase project

---

## 21. Tradeoffs — Honest Assessment

### 21.1 What You Gain

| Gain | Impact |
|---|---|
| Full control of auth, tokens, claims | HIGH — custom claims, MFA, SSO anytime |
| No exposed `anon_key` | HIGH — security surface reduced |
| Application-layer authorization | HIGH — testable, debuggable, monitorable |
| Query plan control | MEDIUM — optimize hot queries with EXPLAIN ANALYZE |
| Custom middleware pipeline | MEDIUM — rate limiting, request tracing, caching |
| Structured logs + metrics | HIGH — know what's happening in production |
| Zero vendor lock-in | HIGH — host anywhere, migrate DB to any provider |
| Single binary deployment | MEDIUM — ops simplicity |
| Lower hosting cost | MEDIUM — 1/5th the memory of a Node.js equivalent |

### 21.2 What You Lose / Pay

| Cost | Impact | Mitigation |
|---|---|---|
| Supabase Dashboard (data viewer) | LOW | Use `pgAdmin` or `TablePlus` locally |
| Supabase Studio (visual schema editor) | LOW | Not needed once stable |
| Automatic API generation from schema | LOW | The custom API is better |
| Free hosted DB | MEDIUM | Neon has a generous free tier |
| 3–4 weeks of development time | HIGH | This is the main real cost |
| Ongoing auth maintenance | MEDIUM | JWTs are well-understood; the code rarely changes |
| GoTrue's OAuth providers | LOW — you don't use them | Add with `golang.org/x/oauth2` if needed later |

### 21.3 Risk vs Benefit Summary

**Migrate if:** This app is the foundation of a product that needs to grow. If you're serious about multi-club SaaS, custom auth, or integrating with other systems, migrate now. The cost grows linearly with time.

**Don't migrate if:** This is purely a club tool for one club, you're the only developer, and you'd rather ship features. Supabase's limitations don't matter at 50 users.

---

## 22. What This Prompt Didn't Ask But You Need

### 22.1 API Contract Documentation (OpenAPI)

Write an OpenAPI 3.0 spec (`openapi.yaml`) before or alongside implementation. Benefits:
- Auto-generate API documentation (Redoc/Swagger UI)
- Generate TypeScript client types for frontend (`openapi-typescript`)
- Use as contract test foundation
- Onboard other developers instantly

Tools: `oapi-codegen` (Go server stubs), `openapi-typescript` (TS client types).

### 22.2 Secret Management

Never store `JWT_SECRET`, `DATABASE_URL`, or any secrets in `.env` files in production. Use:
- **Systemd EnvironmentFile:** On a simple VPS, a root-readable file at `/etc/toastmasters/env` loaded by systemd.
- **Doppler / HashiCorp Vault:** For multi-environment secret management.
- **GitHub Actions Secrets:** For CI/CD pipeline credentials.

Rotate `JWT_SECRET` periodically. When rotated: all access tokens (15-minute TTL) naturally expire. Users need to refresh — handled automatically by frontend.

### 22.3 Database Backup Strategy

PostgreSQL data is now your responsibility (not Supabase's).

**Minimum viable:**

```bash
# Daily cron: pg_dump → compress → upload to S3/Backblaze B2
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
```

**Better:** Use `pgBackRest` or managed DB (Neon, Railway) with automated backups + point-in-time recovery.

**Test restores.** A backup you've never tested is not a backup.

### 22.4 Graceful Shutdown

```go
// In main.go — handle SIGTERM/SIGINT for zero-downtime deploys
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

server := &http.Server{Addr: ":8080", Handler: router}
go server.ListenAndServe()

<-ctx.Done()  // Wait for signal

shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
server.Shutdown(shutdownCtx)  // Drain in-flight requests
hub.Shutdown()                // Close WebSocket connections gracefully
pool.Close()                  // Return DB connections
```

### 22.5 Input Validation

All inputs to handlers must be validated. Every field. Don't trust the frontend.

```go
type CreateMeetingRequest struct {
    Date          time.Time `json:"date"           validate:"required"`
    Theme         string    `json:"theme"          validate:"required,min=1,max=255"`
    Location      string    `json:"location"       validate:"max=500"`
    ThemeQuestion string    `json:"theme_question" validate:"max=1000"`
}
```

Validation errors return 400 with field-level detail:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "fields": [
      { "field": "date", "message": "required" },
      { "field": "theme", "message": "min length is 1" }
    ]
  }
}
```

### 22.6 Error Sentinel Pattern

Never return string errors. Use typed sentinel errors that map to HTTP status codes in a single place:

```go
// internal/domain/errors.go
var (
    ErrNotFound     = errors.New("not found")
    ErrConflict     = errors.New("conflict")
    ErrForbidden    = errors.New("forbidden")
    ErrUnauthorized = errors.New("unauthorized")
    ErrBadRequest   = errors.New("bad request")
)

// internal/transport/http/response.go
func errorResponse(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, domain.ErrNotFound):     respond(w, 404, "NOT_FOUND", err.Error())
    case errors.Is(err, domain.ErrConflict):     respond(w, 409, "CONFLICT", err.Error())
    case errors.Is(err, domain.ErrForbidden):    respond(w, 403, "FORBIDDEN", err.Error())
    case errors.Is(err, domain.ErrUnauthorized): respond(w, 401, "UNAUTHORIZED", err.Error())
    case errors.Is(err, domain.ErrBadRequest):   respond(w, 400, "BAD_REQUEST", err.Error())
    default:
        log.Error("internal error", zap.Error(err))
        respond(w, 500, "INTERNAL_ERROR", "An unexpected error occurred")
    }
}
```

The 500 error never exposes the actual error message to the client — only to your logs.

### 22.7 Frontend Token Refresh Race Condition

When two simultaneous requests both receive a 401, only one should trigger the refresh. Implement a mutex/promise-based refresh lock in the API client. This is 20 lines of code — but it must be written or users will get randomly logged out.

### 22.8 Admin Seed Script

After auth migration, your existing admin profile needs to exist in the new system:

```sql
-- scripts/seed_admin.sql
UPDATE profiles
SET club_role = 'admin',
    member_id = (SELECT id FROM members WHERE lower(email) = lower('your@email.com'))
WHERE id = (SELECT id FROM users WHERE lower(email) = lower('your@email.com'));
```

### 22.9 Dependency Injection in main.go

Wire all dependencies in `main.go`. No global state. Each service receives its dependencies via constructor:

```go
// main.go — the only place that knows about all components
pool     := db.NewPool(cfg.DatabaseURL)
authRepo := repository.NewAuthRepo(pool)
authSvc  := service.NewAuthService(authRepo, cfg.JWTSecret, cfg.AccessTTL, cfg.RefreshTTL)
authH    := http.NewAuthHandler(authSvc)

hub      := ws.NewHub()
go hub.Run()
listener := ws.NewListener(cfg.DatabaseURL, hub)
go listener.Listen(ctx)

server   := http.NewServer(cfg, authH, /* other handlers */, hub)
server.ListenAndServe()
```

No `init()` functions. No singleton registries. Everything is explicit. Testing any component means constructing it with test dependencies.

---

## Final Implementation Order (Recommended)

```
Week 1: Phase 0 (infra) + Phase 1 (auth) — most critical path
Week 2: Phase 2 (CRUD API) — mechanical but large
Week 3: Phase 3 (business logic) + Phase 4 (realtime)
Week 4: Phase 5 (frontend migration) + Phase 6 (cutover)
```

The frontend can run against the custom backend for individual features as each phase completes — you don't need to wait for full completion to start testing end-to-end.

The biggest time investment is auth (getting token refresh and password migration right) and the WebSocket hub. Everything else is mechanical translation of existing Supabase queries into Go handlers.

**Start here:** Scaffold the project structure and get the health check deploying. Momentum matters more than perfection on day 1.
