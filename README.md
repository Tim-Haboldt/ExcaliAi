# Excalidraw AI

This project is a `Next.js` app with an `Excalidraw` canvas and a side chat panel.

Phase 1 wires the side panel to the Vercel AI SDK so the app can stream assistant responses from a provider selected through environment variables. Direct canvas control is intentionally deferred to a later phase.

## Getting Started

1. Install dependencies.
2. Configure your AI provider environment variables.
3. Start the development server.

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## AI Provider Configuration

The chat route reads its provider selection from environment variables.

```bash
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=your_key_here
```

Supported `AI_PROVIDER` values:

- `openai`
- `anthropic`
- `google`

Provider-specific API keys:

- `OPENAI_API_KEY` for `openai`
- `ANTHROPIC_API_KEY` for `anthropic`
- `GOOGLE_GENERATIVE_AI_API_KEY` for `google`

Optional variables:

- `AI_MODEL` to override the default model for the selected provider
- `OPENAI_BASE_URL` to point the OpenAI provider at a compatible endpoint

## Current Scope

- The chat UI streams assistant responses through `app/api/chat/route.ts`.
- Provider selection is isolated in `lib/ai/provider.ts`.
- The system prompt for the workspace assistant lives in `lib/ai/system-prompt.ts`.
- The assistant does not yet read or mutate live Excalidraw state.

## Next Phase

The next phase can expose Excalidraw state through the workspace layer and add structured AI tool calls for canvas edits such as creating shapes, moving elements, or clearing the board.
