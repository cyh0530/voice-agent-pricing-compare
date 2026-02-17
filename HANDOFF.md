# Handoff Summary

## What Has Been Done

### Project Scaffold

- Scaffolded a **React + Vite + TypeScript** project from scratch.
- Installed all dependencies via `npm install` (latest versions) and `npx shadcn@latest add` for UI components.
- **Stack**: Vite 7, React 19, Tailwind CSS v4 (with `@tailwindcss/vite` plugin), shadcn/ui (new-york style), chart.js + react-chartjs-2, TanStack Router (installed, not yet wired as router — URL state is managed manually via `pushState`/`replaceState`).

### Data Layer (`src/data/`)

- **`types.ts`** — All TypeScript types: `StackConfig`, `CostBreakdown` (with `noiseCancellation` field), `CostDetail`, enums for platforms, models, etc. Model lists trimmed to latest generation only.
- **`pricing.ts`** — Complete snapshot pricing catalogs with source URLs and `lastVerifiedAt` dates (Feb 2026):
  - LiveKit Cloud plans (**Ship/Scale only**, Build excluded as dev-only). Each plan includes full cost structure: agent session minutes, WebRTC participant minutes, observability recordings, recording transcode, downstream data transfer, inference credits, and STT/TTS discount flags.
  - LiveKit Inference pricing: STT per-minute, TTS per-million-chars, LLM per-million-tokens (with cached input rates).
  - LiveKit speech-to-speech models (OpenAI Realtime, Gemini Live).
  - Pipecat Cloud: Agent-1x hosting ($0.01/min active), Daily WebRTC transport (free for all 1:1 voice sessions), recording (audio/video + storage).
  - Krisp VIVA noise cancellation: tiered pricing on Pipecat Cloud (free first 10K min, $0.0015/min after). Daily add-on for self-hosted Pipecat ($0.0002/participant-min). Included free on LiveKit Cloud.
  - Daily WebRTC standalone tiered volume discounts (7 tiers from free 10K to 50M+).
  - Direct provider pricing (for self-hosted / BYOP): AssemblyAI, Cartesia, Deepgram STT; Cartesia, ElevenLabs TTS; OpenAI and Google LLM.
  - Azure hosting: App Service P1v3 and AKS Standard with autoscaling assumptions.
  - Conversation assumptions: 900 TTS chars/min, 800 input tokens/min, 400 output tokens/min, 30% cache hit rate, 0.24 MB/min downstream data transfer.
- **`compatibility.ts`** — Block rules cleared (both previous rules were incorrect). Option lists trimmed to latest-gen models only:
  - STT: AssemblyAI Universal Streaming (+ Multilingual), Cartesia Ink Whisper, Deepgram Nova-3 (+ Multilingual, Medical)
  - LLM: GPT-5.2, Gemini 3 Pro, Gemini 3 Flash
  - TTS: Cartesia Sonic 3, ElevenLabs Multilingual v2
  - S2S: OpenAI Realtime, Gemini Live
- **`defaults.ts`** — 4 default stacks: Pipecat Cloud, LiveKit Cloud, Pipecat Self-Host, LiveKit Self-Host. All use latest-gen models (deepgram-nova-3, gpt-5.2, cartesia-sonic-3).

### Cost Engine (`src/lib/cost-engine.ts`)

- **`calculateCost(stack, monthlyMinutes)`** — Main entry point returning full `CostBreakdown` with per-category subtotals (platform, transport, noiseCancellation, stt, llm, tts, recording, hosting), formula detail strings, best plan name, and warnings.
- **LiveKit plan optimizer (holistic)** — Evaluates Ship and Scale plans by computing **total cost across all plan-based line items**: base fee + agent session overage + WebRTC participant overage + observability recording overage + recording transcode overage + downstream data transfer overage + inference costs (STT+LLM+TTS minus included credits). Picks the plan with the lowest total. Scale's inference discounts on STT/TTS are properly weighed against its higher base fee.
- **LiveKit inference** — Computes STT, LLM, TTS costs using LiveKit's inference pricing, applying Scale plan discounts when applicable. Inference credits ($5 Ship, $50 Scale) are subtracted proportionally.
- **Pipecat Cloud** — Agent-1x active minutes. Transport always free (1:1 voice sessions). Direct provider pricing for STT/LLM/TTS.
- **Self-hosted** — Azure compute (App Service vs AKS auto-selection) + direct provider costs. Pipecat self-hosted also includes Daily WebRTC tiered transport.
- **Speech-to-speech** — When pipeline is S2S, calculates single per-minute model cost instead of STT+LLM+TTS.
- **Noise cancellation (Krisp)** — Three tiers: LiveKit Cloud ($0, included), Pipecat Cloud (Krisp VIVA tiered), Pipecat self-hosted ($0.0002/min via Daily add-on), LiveKit self-hosted (contact Krisp).
- **Recording** — LiveKit Cloud uses plan-specific transcode rates with included minutes. Pipecat/self-hosted uses Daily recording rates (audio $0.005/min, video $0.01349/min) + storage ($0.003/min).
- **`generateChartData(stack)`** — Produces chart points at 10 predefined minute ticks (0 to 100K).

### URL State (`src/lib/url-state.ts`)

- Encodes/decodes all stack configurations + monthly minutes into URL search params.
- Uses `replaceState` so browser back button isn't polluted.
- Shareable: pasting the URL reproduces the exact comparison.

### UI Components (`src/components/`)

- **`Header.tsx`** — Title, description with LiveKit/Pipecat color highlights, "USD pre-tax" and "Feb 2026" badges.
- **`MinutesSlider.tsx`** — Logarithmic-scale slider (500–100K) with tick labels positioned to match the log scale. Quick-select tick buttons.
- **`CostChart.tsx`** — react-chartjs-2 line chart with focus+context (click to highlight one series, dim others), vertical annotation line at current slider value, custom dark theme styling.
- **`ComparisonTable.tsx`** — Grid of StackColumns, "Add Stack" button (up to 8), horizontal scroll with fade indicator for 5+ stacks.
- **`StackColumn.tsx`** — Apple-compare-style card per stack. Editable label, visibility toggle, remove button. Dropdown selects for platform, hosting, pipeline, STT, LLM, TTS (or S2S model), calls, recording. Cost subtotals grid includes noise cancellation line. "Best plan" indicator. Block warning for unsupported combos.
- **`CellPopover.tsx`** — Hover any cost cell to see formula breakdown popover (category, label, formula string, dollar amount).
- **`RestrictionNotes.tsx`** — Informational cards listing platform restrictions (LiveKit plan limits, Pipecat unlimited concurrency, self-hosted no SLA).
- **`FAQ.tsx`** — Azure App Service vs AKS recommendation. Accordion FAQ: assumptions, plan optimizer logic, self-hosted scope, S2S models, accuracy disclaimers.
- **`App.tsx`** — Main orchestrator: state management, URL sync, reset button, "Cheapest" badge on lowest-cost stack, summary cost cards sorted by price.

### Design

- **"Circuit Noir" dark theme** — Near-black background (#06070A), luminous green (#06D6A0) and violet (#7C5CFC) accents.
- **Typography** — Syne (display headings), Outfit (body), IBM Plex Mono (data/numbers). Loaded via Google Fonts.
- **Effects** — Subtle noise texture overlay, radial gradient background, custom scrollbar, glow utilities, stagger animation delays.
- **All CSS variables** defined in `src/index.css` using Tailwind v4's `@theme inline` and `:root` blocks.
- **Favicon** — Custom SVG with gradient accent in `public/vite.svg`.

### Quality

- **TypeScript**: zero type errors (`tsc --noEmit` passes clean).
- **Build**: production build succeeds (`npm run build`), outputs ~580KB JS + ~51KB CSS.
- **Lint warnings**: all resolved.

---

## What Was Learned

### Pricing Research (Feb 2026 snapshot)

#### LiveKit Cloud

1. **LiveKit Cloud** uses a subscription model (Build/Ship/Scale). Build is dev-only (1 deployment, 5 concurrent). Ship ($50/mo) and Scale ($500/mo) are production plans.
2. **Ship plan**: 5K agent min, 150K WebRTC min, 5K observability min, 600 transcode min, 250GB data transfer, $5 inference credits.
3. **Scale plan**: 50K agent min, 1.5M WebRTC min, 50K observability min, 8K transcode min, 3TB data transfer, $50 inference credits + inference discounts on STT/TTS.
4. **Agent session overage** is $0.01/min on **both** Ship and Scale. The plans never differ on agent minutes alone — Scale's value comes entirely from inference discounts and larger included pools for WebRTC, observability, recording, and data transfer.
5. **LiveKit Inference** bundles STT/LLM/TTS billing through their platform at specific per-unit rates (not identical to direct provider pricing). Scale plan gets discounted STT and TTS rates.
6. **Enhanced noise cancellation** (Krisp) is included at no extra cost on all LiveKit Cloud plans.

#### Pipecat Cloud / Daily

7. **Pipecat Cloud** charges agent-1x at $0.01/min active. Daily WebRTC 1:1 voice transport is **free** on Pipecat Cloud (including for audio-video multimodal, but we only model voice agents).
8. **Krisp VIVA** on Pipecat Cloud: free for first 10K active session minutes/month, then $0.0015/min. Source: https://www.daily.co/pricing/pipecat-cloud/#krisp-viva
9. **Daily WebRTC** (standalone, for self-hosted Pipecat) has **graduated volume discounts** across 7 tiers — first 10K minutes free, then $0.004 down to $0.0015 at 50M+. Audio-only rates are separate and cheaper.
10. **Daily Krisp add-on** for standalone WebRTC / self-hosted Pipecat: $0.0002/participant-minute. Source: https://www.daily.co/pricing/video-sdk/ (Add-ons section).
11. **Pipecat Cloud recording**: Audio only $0.005/min, Audio+Video $0.01349/min, Storage $0.003/min.
12. **Pipecat Cloud telephony** (SIP $0.005/min, PSTN $0.018/min) exists but is not yet modeled in the calculator.

#### Direct Providers

13. **Cartesia** uses a credit-based system. The Scale plan ($239/mo, 8M credits) works out to roughly $30/M chars for TTS.
14. **ElevenLabs** Multilingual v2 on Business plan works out to ~$0.12/min (~$120/M chars).
15. **AssemblyAI** streaming STT is $0.15/hr ($0.0025/min) — among the cheapest STT options.
16. **Deepgram** Nova-3 is $0.0077/min PAYG, $0.0065/min on Growth plan.

### Technical Decisions

- Used **logarithmic slider scale** because a linear 500–100K range made low values (1K–10K) nearly invisible on the track.
- **Did not wire TanStack Router as a full router** — the app is a single page, so URL state is managed via `window.history.replaceState` with a custom encode/decode scheme.
- **Plan optimizer is holistic** — evaluates total cost across all plan-based line items (agent sessions, WebRTC, observability, recording, data transfer, inference) to choose between Ship and Scale. This correctly recommends Scale at volumes where inference discounts + larger included pools offset the $500 base fee.
- **Model lists trimmed to latest generation** — only show the newest model per provider/tier (e.g., Nova-3 not Nova-2, Gemini 3 not 2.5, Sonic 3 not Sonic 2).
- **Block rules removed** — both original rules were incorrect (LiveKit self-hosted supports S2S; Pipecat Cloud supports video on agent-1x).

---

## What's Next To Do

### High Priority

1. **Telephony support** — Add connection type selector (WebRTC vs SIP vs PSTN) to StackConfig. Pipecat Cloud SIP is $0.005/min, PSTN is $0.018/min. LiveKit Cloud also has telephony pricing ($0.01/min inbound, phone number rental). This is a significant cost for phone-based voice agents.
2. **Unit tests** — The `PLAN.md` calls for unit tests on formulas, tier thresholds, discounts, and plan selection. Golden fixtures at 1K/5K/10K/50K/100K minutes. None have been written yet. Consider Vitest (already Vite-based).
3. **Visual QA** — The data layer has changed significantly (new cost categories, removed models, updated plan structure). Run the dev server and verify the UI still renders correctly — dropdowns populate, cost breakdowns display, chart updates, popovers show correct formulas.

### Medium Priority

4. **GitHub Pages deployment** — Add a GitHub Actions workflow for `npm run build` → deploy `dist/` to GitHub Pages. The `vite.config.ts` already sets `base: './'` for relative paths.
5. **Responsive polish** — The layout works on desktop but could use more testing/refinement on mobile (especially the comparison table horizontal scroll and the chart panel).
6. **Wire TanStack Router properly** — Replace the manual `pushState`/`decodeState` with TanStack Router's search param management for cleaner URL state handling.

### Lower Priority

7. **Integration tests** — Verify that changing a dropdown in the table actually updates the chart and the cost summary cards consistently.
8. **ElevenLabs subscription optimization** — Currently uses a flat direct rate. Could implement plan-tier optimization based on usage.
9. **Cartesia subscription optimization** — Same as above for Cartesia's tiers.
10. **Dynamic Azure recommendation** — The FAQ currently has a static recommendation. Could make it reactive to the user's selected minute tier.
11. **Accessibility** — Add keyboard navigation for the comparison table, ARIA labels on interactive elements, screen reader support for the chart.
12. **Remove unused dependencies** — `puppeteer` is in `package.json` but not used. `@tanstack/react-router` is installed but not actively used.
13. **Transcription / streaming costs** — Daily offers realtime transcription ($0.0059/min), post-call transcription ($0.0043/min), summarization ($0.003/min), RTMP streaming ($0.015/min). These are out of scope for the basic voice agent cost comparison but could be added as optional line items.

---

## Pricing Audit Status

Full audit completed against three pricing pages (Feb 2026):

| Source                                                                                        | Status                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [livekit.io/pricing](https://livekit.io/pricing)                                              | ✅ All agent, inference, observability, recording, transport, data transfer costs included. Ship + Scale plans fully modeled.                                                |
| [livekit.io/pricing/inference](https://livekit.io/pricing/inference)                          | ✅ STT/TTS/LLM rates verified for all included models. Scale discount rates included.                                                                                        |
| [daily.co/pricing/pipecat-cloud](https://www.daily.co/pricing/pipecat-cloud/)                 | ✅ Hosting, transport, Krisp VIVA, recording all included. ⚠️ Telephony (SIP/PSTN) not yet modeled.                                                                          |
| [daily.co/pricing/video-sdk](https://www.daily.co/pricing/video-sdk/)                         | ✅ Tiered transport rates match. Recording rates match. Krisp add-on ($0.0002/min) now included for self-hosted Pipecat. ⚠️ Telephony, transcription, streaming not modeled. |
| [daily.co/pricing/webrtc-infrastructure](https://www.daily.co/pricing/webrtc-infrastructure/) | ✅ Transport tiers match. Recording rates match. Krisp add-on included.                                                                                                      |

---

## File Map

```
src/
├── data/
│   ├── types.ts              # All TypeScript types and enums (CostBreakdown includes noiseCancellation)
│   ├── pricing.ts            # Snapshot pricing catalogs — LiveKit plans (Ship/Scale), inference, Krisp, Pipecat, Daily, Azure
│   ├── compatibility.ts      # Block rules (empty), option lists (latest-gen only), chart colors
│   └── defaults.ts           # Default 4-stack comparison
├── lib/
│   ├── cost-engine.ts        # Deterministic cost calculation + holistic plan optimizer (536 lines)
│   ├── url-state.ts          # URL encode/decode for shareable links
│   └── utils.ts              # shadcn cn() utility
├── components/
│   ├── ui/                   # shadcn/ui primitives (11 components)
│   ├── Header.tsx
│   ├── MinutesSlider.tsx      # Log-scale slider with positioned ticks
│   ├── CostChart.tsx          # react-chartjs-2 line chart
│   ├── ComparisonTable.tsx    # Grid container for stack columns
│   ├── StackColumn.tsx        # Single stack config card with dropdowns + noise cancellation line
│   ├── CellPopover.tsx        # Formula breakdown popover
│   ├── RestrictionNotes.tsx
│   └── FAQ.tsx                # Azure recommendation + accordion FAQ
├── App.tsx                    # Main orchestrator
├── main.tsx                   # Entry point
└── index.css                  # Tailwind v4 theme + custom CSS
```
