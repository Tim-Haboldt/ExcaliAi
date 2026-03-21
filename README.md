# Excalidraw AI Integration

A small vibe coded side project that pairs an [Excalidraw](https://excalidraw.com/) canvas with an AI-powered chat assistant. Ask the AI to draw diagrams, create flowcharts, modify shapes, render Mermaid syntax — and watch it all happen in real time on the canvas. Invite friends to collaborate on the same board with live cursors and presence.

![Project Preview](projectPreview.png)

## Features

### AI-Powered Canvas

- **Streaming AI chat panel** beside the canvas — talk to the assistant and watch it manipulate the drawing live.
- **Canvas-aware tools** — the AI can read the current scene (JSON + PNG screenshot), replace the entire canvas, add/update/delete individual elements, create labeled shapes with centered text, and render Mermaid diagrams.
- **Multi-provider support** — swap between OpenAI, Anthropic, and Google with a single environment variable.
- **Quick prompt from canvas** — click "Ask AI" directly on the canvas toolbar, optionally with elements selected, to fire off a prompt without switching to the chat panel.
- **Multi-step tool calling** — the AI can chain up to 10 tool calls per turn for complex operations.

### Real-Time Collaboration

- **Live canvas sync** — edits are broadcast to all collaborators via Socket.IO.
- **Live cursors** — see where other users are pointing in real time.
- **Presence indicators** — colored initials show who is currently in the project.
- **Invite by username** — send invitations from the sidebar; recipients can accept or decline.
- **Shared chat messages** — chat messages are broadcast to all collaborators in real time.

### Project Management

- **Multiple projects** — create, switch between, and delete projects from a collapsible sidebar.
- **Shared project badges** — projects with multiple members show a shared indicator.
- **Auto-save** — canvas and chat state are persisted to PostgreSQL every 30 seconds.
- **Multiple chats per project** — create, switch, and delete chat threads within each project.
- **Soft-delete** — projects are only hard-deleted when the last member leaves.

### Canvas

- **Full Excalidraw experience** — draw, select, move, resize, and style shapes with all the tools Excalidraw provides.
- **Mermaid diagram rendering** — the AI converts Mermaid syntax into native Excalidraw elements.
- **Labeled shapes** — rectangles, diamonds, and ellipses with automatically centered text labels.
- **Export options** — save as image, export scene data, clear canvas.
- **Theme toggle** — switch between light and dark mode.

### Authentication

- **Username-based auth** — simple login/register flow with no passwords.
- **Cookie sessions** — persistent sessions via iron-session.

### Workspace

- **Resizable panels** — drag the handle to adjust the canvas/chat split.
- **Collapsible sidebar and chat** — maximize canvas space when you need it.
- **Responsive layout** — panels stack vertically on smaller screens.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 25+
- [pnpm](https://pnpm.io/) 10+
- [PostgreSQL](https://www.postgresql.org/) 15+

### Installation

```bash
pnpm install
```

### Database Setup

```bash
npx prisma generate
npx prisma migrate dev
```

### Environment Variables

Create a `.env` file in the project root:

```bash
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/excalidraw_ai

# Session
SESSION_SECRET=your-secret-at-least-32-characters-long

# AI
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=your_key_here

# Socket.IO
SOCKET_PORT=3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

#### Supported AI Providers

| `AI_PROVIDER` | Required API Key               |
| ------------- | ------------------------------ |
| `openai`      | `OPENAI_API_KEY`               |
| `anthropic`   | `ANTHROPIC_API_KEY`            |
| `google`      | `GOOGLE_GENERATIVE_AI_API_KEY` |

`AI_MODEL` overrides the default model for the selected provider.

### Run

Start both the Next.js dev server and the Socket.IO server:

```bash
# Terminal 1
pnpm dev:next

# Terminal 2
pnpm dev:socket
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                  | Description                        |
| ------------------------ | ---------------------------------- |
| `pnpm dev:next`          | Start Next.js development server   |
| `pnpm dev:socket`        | Start Socket.IO server (port 3001) |
| `pnpm build`             | Production build                   |
| `pnpm start`             | Start production server            |
| `pnpm lint`              | Run ESLint                         |
| `pnpm prettier`          | Format all files with Prettier     |
| `pnpm test:e2e`          | Run Playwright end-to-end tests    |
| `npx prisma generate`    | Generate Prisma client             |
| `npx prisma migrate dev` | Apply database migrations          |
| `npx tsc --noEmit`       | Type-check without emitting files  |

## Tech Stack

- **[Next.js](https://nextjs.org/) 16** — App Router, React 19, TypeScript 5.9
- **[Excalidraw](https://excalidraw.com/) 0.18** — Canvas drawing library
- **[Vercel AI SDK](https://sdk.vercel.ai/) 6** — Streaming AI with tool calling
- **[Socket.IO](https://socket.io/) 4** — Real-time collaboration
- **[Prisma](https://www.prisma.io/) 7** — ORM with PostgreSQL
- **[iron-session](https://github.com/vvo/iron-session) 8** — Cookie-based session auth
- **[TanStack Query](https://tanstack.com/query) 5** — Server state management
- **[Tailwind CSS](https://tailwindcss.com/) 4** — Styling
- **[Zod](https://zod.dev/) 4** — Schema validation
- **[Playwright](https://playwright.dev/)** — End-to-end testing

## Project Structure

```
app/
├── api/                          API route handlers
│   ├── auth/                     Login, register, session, logout
│   ├── chat/                     Streaming AI chat with canvas tools
│   ├── projects/                 CRUD for projects
│   └── invitations/              Send, accept, decline invitations
├── components/
│   ├── auth/                     Login/register form
│   ├── chat/                     Chat panel, composer, message list, chat selector
│   ├── collaboration/            Socket provider, presence, invitations
│   ├── excalidraw/               Canvas wrapper, AI quick prompt, scene schema
│   ├── sidebar/                  Project list, create/delete projects
│   └── workspace/                Layout, resizable panels, canvas operations
├── hooks/                        useAuth, useProjects, useSocket, useChats, etc.
└── providers/                    TanStack Query provider

lib/
├── ai/                           AI provider config, system prompt, tool schemas
├── database.ts                   Prisma client singleton
├── session.ts                    iron-session helpers
└── environment.ts                Zod-based env validation

server/
├── socket-server.ts              Standalone Socket.IO server
└── socket-events.ts              Typed event definitions

prisma/                           Schema and migrations
e2e/                              Playwright tests and helpers
```
