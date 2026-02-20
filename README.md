# Voice Agent Cost Compare — LiveKit vs Pipecat

Interactive calculator for comparing monthly costs of voice AI agent deployments across LiveKit Cloud, Pipecat Cloud, and self-hosted configurations.

**[Live demo](https://cyh0530.github.io/voice-agent-pricing-compare/)**

## What it does

Configure up to 8 side-by-side stacks — pick a platform, hosting model, STT/LLM/TTS providers (or a speech-to-speech model), and slide through 500–100K monthly agent minutes to see how costs scale. Every number links back to a formula popover so you can verify the math yourself.

Covers:

- **LiveKit Cloud** (Ship & Scale plans) with holistic plan optimization across agent sessions, WebRTC, observability, recording, data transfer, and inference credits
- **Pipecat Cloud** with Agent-1x hosting, free 1:1 Daily WebRTC transport, Krisp VIVA noise cancellation tiers
- **Self-hosted** on Azure (AKS) with direct provider pricing and Daily WebRTC volume discounts
- **Speech-to-speech** models (OpenAI Realtime, Gemini Live) as an alternative to the STT+LLM+TTS pipeline

## Pricing snapshot

All rates verified against public pricing pages as of **February 2026**. Sources include LiveKit, Daily/Pipecat, Deepgram, AssemblyAI, Cartesia, ElevenLabs, OpenAI, Google, and Azure. Full source links are listed at the bottom of the app.

This project is not affiliated with LiveKit or Daily/Pipecat.

## Tech stack

React 19, TypeScript, Vite 7, Tailwind CSS v4, shadcn/ui, Chart.js

## Getting started

```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`. All state is encoded in the URL — share a link to reproduce any comparison.

## Build & deploy

```bash
npm run build   # outputs to dist/
npm run preview # preview the production build locally
```

Pushes to `main` auto-deploy to GitHub Pages via the workflow in `.github/workflows/deploy.yml`.

## Project structure

```
src/
├── data/
│   ├── types.ts           # TypeScript types and enums
│   ├── pricing.ts         # Snapshot pricing catalogs with source URLs
│   ├── compatibility.ts   # Model option lists, chart colors
│   ├── defaults.ts        # Default 4-stack comparison
│   └── catalog.ts         # Provider catalog metadata
├── lib/
│   ├── cost-engine.ts     # Deterministic cost calculation + plan optimizer
│   ├── cost/engine.ts     # Extended cost engine utilities
│   └── url-state.ts       # URL encode/decode for shareable links
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── Header.tsx
│   ├── MinutesSlider.tsx  # Log-scale slider with tick labels
│   ├── CostChart.tsx      # Line chart with focus+context interaction
│   ├── ComparisonTable.tsx
│   ├── StackColumn.tsx    # Per-stack config card with dropdowns
│   ├── CellPopover.tsx    # Formula breakdown on hover
│   ├── RestrictionNotes.tsx
│   └── FAQ.tsx
├── App.tsx
├── main.tsx
└── index.css              # Tailwind v4 theme + custom styles
```

## License

MIT
