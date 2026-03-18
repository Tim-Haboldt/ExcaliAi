# Excalidraw AI

A Next.js application that pairs an [Excalidraw](https://excalidraw.com/) canvas with an AI-powered chat panel. The AI assistant can read, create, modify, and delete elements on the canvas through structured tool calls — all streamed in real time.

## Features

- **Interactive Excalidraw canvas** — full drawing experience powered by Excalidraw 0.18.
- **AI chat panel** — streaming conversation interface beside the canvas.
- **Canvas-aware AI tools** — the assistant can:
    - **Read** the current canvas state as structured JSON.
    - **Screenshot** the canvas as a PNG for visual inspection.
    - **Replace** the entire canvas with a new set of elements.
    - **Update** specific elements by ID (add or modify).
    - **Delete** elements by ID.
- **Multi-provider support** — swap between OpenAI, Anthropic, and Google with a single environment variable.
- **Real-time tool feedback** — the chat UI shows live status indicators while the AI reads or modifies the canvas.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 25+
- [pnpm](https://pnpm.io/) 10+

### Installation

```bash
pnpm install
```

### Environment Variables

Create a `.env` file in the project root:

```bash
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=your_key_here
```

#### Supported Providers

| `AI_PROVIDER` | Required API Key               |
| ------------- | ------------------------------ |
| `openai`      | `OPENAI_API_KEY`               |
| `anthropic`   | `ANTHROPIC_API_KEY`            |
| `google`      | `GOOGLE_GENERATIVE_AI_API_KEY` |

`AI_MODEL` is optional — it overrides the default model for the selected provider.

### Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
app/
├── api/chat/route.ts                 # Chat API — tools, streaming, message sanitization
├── page.tsx                          # Root page — renders Workspace
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx             # Chat hook, transport, tool-call application
│   │   ├── ChatComposer.tsx          # Message input and send button
│   │   └── ChatMessageList.tsx       # Message display and tool status indicators
│   ├── workspace/
│   │   ├── Workspace.tsx             # Layout — canvas + chat panel
│   │   └── useExcalidrawOperations.ts# All canvas read/write operations
│   └── excalidraw/
│       ├── ExcalidrawCanvas.tsx       # Dynamic Excalidraw import (no SSR)
│       └── excalidrawSceneSchema.ts   # Zod schema for scene validation
lib/
├── ai/
│   ├── provider.ts                   # AI model selection from env
│   ├── system-prompt.ts              # Workspace assistant system prompt
│   └── excalidraw-ai-schema.ts       # AI ↔ Excalidraw schema conversion
└── environment.ts                    # Environment variable validation
```

### Data Flow

1. The user types a message in the chat panel.
2. Before each request, the transport captures the current canvas state (JSON) and a PNG screenshot.
3. The request is sent to `/api/chat` with the conversation history, scene, and screenshot.
4. The API streams the assistant's response using the Vercel AI SDK. The assistant can invoke canvas tools across multiple steps.
5. Tool-call parts in the streamed response are detected on the client and applied to the Excalidraw canvas via the imperative API.

## Tech Stack

- **[Next.js](https://nextjs.org/)** 16 — React framework
- **[Excalidraw](https://excalidraw.com/)** 0.18 — Canvas drawing library
- **[Vercel AI SDK](https://sdk.vercel.ai/)** 6 — Streaming AI with tool calling
- **[Tailwind CSS](https://tailwindcss.com/)** 4 — Styling
- **[Zod](https://zod.dev/)** 4 — Schema validation

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `pnpm dev`      | Start development server |
| `pnpm build`    | Production build         |
| `pnpm start`    | Start production server  |
| `pnpm lint`     | Run ESLint               |
| `pnpm prettier` | Format with Prettier     |
