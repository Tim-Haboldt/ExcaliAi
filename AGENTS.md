---
description: Project-wide operational guide for AI coding agents
alwaysApply: true
---

# Excalidraw AI Integration — Agent Guide

## Commands

- Install: `pnpm install`
- Build: `pnpm build`
- Dev (Next.js): `pnpm dev:next`
- Dev (Socket server): `pnpm dev:socket`
- Lint: `pnpm lint`
- Format: `pnpm prettier --write .`
- Format check: `pnpm prettier --check .`
- Type check: `npx tsc --noEmit`
- E2E tests: `pnpm test:e2e`
- Generate Prisma client: `npx prisma generate`
- Apply migrations: `npx prisma migrate dev`

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5.9
- **Canvas:** Excalidraw 0.18
- **AI:** Vercel AI SDK 6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/react`)
- **Styling:** Tailwind CSS 4
- **Server state:** TanStack Query 5 (`@tanstack/react-query`)
- **Real-time:** Socket.IO 4 (standalone server on port 3001)
- **Validation:** Zod 4
- **ORM:** Prisma 7.4 with PostgreSQL (`@prisma/adapter-pg`)
- **Auth:** iron-session 8 (cookie-based sessions)
- **E2E tests:** Playwright
- **Package manager:** pnpm

## Project Structure

```
app/                    Next.js App Router
  api/                  API route handlers (auth, chat, projects, invitations)
  components/           React components grouped by domain
    auth/               Authentication UI
    chat/               Chat panel, composer, message list
    collaboration/      Invitations, presence, Socket.IO provider
    excalidraw/         Canvas wrapper, AI quick prompt, scene schema
    sidebar/            Project sidebar
    workspace/          Workspace layout, panel resize, Excalidraw operations hook
  hooks/                Custom React hooks (useAuth, useProjects, useSocket, etc.)
  providers/            QueryProvider (TanStack Query + devtools)
lib/                    Shared utilities
  ai/                   AI provider config, system prompt, Excalidraw AI schema
  database.ts           Prisma singleton
  session.ts            iron-session helpers
  environment.ts        Zod-based env validation
  generated/prisma/     Auto-generated Prisma client (do NOT edit)
server/                 Standalone Socket.IO server
  socket-server.ts      HTTP + Socket.IO setup
  socket-events.ts      Typed event definitions
prisma/                 Schema and migrations
e2e/                    Playwright E2E tests and helpers
```

## Architecture Patterns

### Imports

- Use the `@/*` path alias for `lib/`, `server/`, and cross-domain imports.
- Use relative imports for siblings and nearby files within the same domain folder.
- Do not create barrel exports (`index.ts` re-export files).

### File Naming

- **Components:** PascalCase — `ChatPanel.tsx`, `ExcalidrawCanvas.tsx`
- **Hooks:** camelCase with `use` prefix — `useProjects.ts`, `useSocket.ts`
- **API routes:** `route.ts` inside route directories — `app/api/chat/route.ts`
- **E2E tests:** `*.spec.ts` — `auth.spec.ts`, `chat.spec.ts`
- **E2E helpers:** `*-helpers.ts` — `auth-helpers.ts`, `canvas-helpers.ts`
- **Config files:** kebab-case or `*.config.*` — `next.config.ts`, `eslint.config.mjs`

### Components

- Functional components with hooks only (no class components).
- Group components by domain: `auth/`, `chat/`, `collaboration/`, `excalidraw/`, `sidebar/`, `workspace/`.
- Use `forwardRef` with imperative handles when parent components need to call child methods.

### State Management

- **Server state:** TanStack Query (`useQuery`, `useMutation`). Invalidate queries on mutation success.
- **UI state:** React `useState` / `useReducer`.
- **Real-time:** Socket.IO via `SocketProvider` context.
- **Chat:** `useChat` from `@ai-sdk/react`.
- **Canvas:** Excalidraw imperative API (read/write via refs).

### Data Fetching

- Use native `fetch()` — no axios or other HTTP clients.
- Wrap fetches in TanStack Query hooks.
- Query keys follow the pattern: `["projects"]`, `["project", projectId]`, `["session"]`, `["invitations"]`.

### API Routes

- Authenticate with `getAuthenticatedSession()` from `@/lib/session`.
- Return responses with `NextResponse.json()`.
- Validate request bodies with Zod schemas.

### Database

- Import the Prisma client from `@/lib/database`.
- Generated client output lives in `lib/generated/prisma/` (auto-generated, never hand-edit).
- After modifying `prisma/schema.prisma`, run `npx prisma generate` and `npx prisma migrate dev`.

### Formatting

- 4-space indentation, no tabs (enforced by Prettier).
- Verify with `pnpm prettier --check .`, fix with `pnpm prettier --write .`.

## Coding Standards

- Keep files to roughly **500 lines**. Extract into separate modules when they grow beyond that.
- Use **early returns** to avoid deep nesting inside `if` blocks.
- `if` statements must use **block bodies** — no single-line forms like `if (x) return y;`.
- Prefer `switch`/`case` over chaining `if`/`else if` on the same variable.
- Use **descriptive names** — no abbreviations or single-letter identifiers (`p`, `elem`, `calc`). Spell them out (`product`, `rootElement`, `calculateTotal`).
- Add a **blank line before `return`**, unless it's the only statement in the block.
- **Group related code** with blank lines to separate logically distinct sections.
- Avoid **type assertions** (`as`) as much as possible. Prefer type guards, generics, or explicit type annotations that let the compiler verify correctness instead of silently overriding it.

```typescript
// Bad
function process(input: string | null) {
    if (input) {
        const t = input.trim();
        if (t.length > 0) return t.toUpperCase();
    }
    return "";
}

// Good
function process(input: string | null) {
    if (!input) {
        return "";
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
        return "";
    }

    return trimmed.toUpperCase();
}
```

## Boundaries

- **Always:** run `npx tsc --noEmit` and `pnpm lint` after making changes. Use `pnpm` (not npm or yarn). Follow existing patterns in the codebase.
- **Ask first:** adding new production dependencies, modifying `prisma/schema.prisma`, changing API route request/response contracts, adding or modifying Socket.IO events in `server/socket-events.ts`.
- **Never:** edit files in `lib/generated/prisma/`, commit `.env` or secrets, modify `node_modules/`, force push to remote, skip type checking.

## Definition of Done

A task is complete when ALL of the following pass:

1. `npx tsc --noEmit` exits 0
2. `pnpm lint` exits 0
3. `pnpm prettier --check .` exits 0
4. No regressions in related E2E tests

## Escalation Rules

- If tests fail after 2 fix attempts, stop and report the failing test with full output.
- If a change requires modifying the database schema, stop and ask before proceeding.
- If unsure which component or architectural pattern to follow, stop and ask.
- Never delete files to resolve errors.
- Never force push or skip pre-commit hooks.
