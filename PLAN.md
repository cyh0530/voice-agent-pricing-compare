# LiveKit vs Pipecat Cost Comparison Website Plan

This file mirrors `.agent/plans/PLAN.md` and is the working planning doc requested for implementation.

## Product Outcome

Build a frontend-only comparison website (React + Vite + TanStack Start + shadcn + Tailwind, hosted on GitHub Pages) that helps users choose between:

- Pipecat Cloud (Agent-1x + Daily transport)
- Pipecat self-hosted (Azure assumptions)
- LiveKit Cloud
- LiveKit self-hosted (Azure assumptions)

The app compares monthly costs across usage tiers and custom stacks, with transparent formulas and shareable URL state.

## Locked Decisions from Interview

- Pricing mode: dated snapshot model (`lastVerifiedAt` metadata), not live scrape.
- Optimization objective: minimize monthly cost with practical headroom.
- Self-hosting model: autoscaling assumptions (not fixed static infra table).
- Traffic profile: flat monthly usage for v1.
- Session model: single average session duration assumption for v1.
- Recording scope: provider recording charges only (no storage lifecycle TCO in v1).
- Unsupported combinations: hard-block in UI with explanation.
- URL state: core comparison config only (not all UI/presentation state).
- Explainability: medium formula breakdown in hover popovers.
- Chart behavior: focus + context (highlight selected, dim others).
- Restriction handling: informational sidenotes only (no scoring penalty).
- Confidence display: deterministic output only (no uncertainty bands in UI).
- Currency/tax: USD pre-tax only.
- Model versioning: pin exact model IDs at release; update via PR.
- Data storage: keep pricing catalog in TypeScript files.
- Comparison readability: allow show/hide per stack/line and per table column.
- Chart library: `react-chartjs-2`.
- Scope cuts: no planned deferral for v1.

## Core User Flows

1. User opens site and sees default comparison stacks + line chart.
2. User edits up to 8 stack columns:
   - platform, hosting, pipeline
   - STT, LLM, TTS
   - call mode (audio-only/audio+video)
   - recording mode
3. Chart updates immediately for usage minute tiers and slider-selected monthly minutes.
4. Hovering cells shows formula breakdown popover.
5. User toggles show/hide for lines/columns to maintain readability.
6. URL updates with core state so link sharing reproduces comparison.
7. Bottom FAQ section shows recommendation that is either App Service or AKS, with rationale and tradeoffs.

## Data + Engine Design

- Store snapshot pricing catalogs in `src/data/**/*.ts` with metadata:
  - `sourceUrl[]`
  - `lastVerifiedAt`
  - assumptions notes
- Implement deterministic cost functions in `src/lib/cost/`:
  - normalize inputs
  - platform/provider/recording subtotals
  - best-plan selection with headroom
- Provider scope:
  - STT: AssemblyAI, Cartesia, Deepgram, ElevenLabs
  - LLM: pinned OpenAI + Gemini model IDs
  - TTS: Cartesia + ElevenLabs

## UI/UX Plan

- Apple-compare-style stack table with up to 8 columns.
- Hard-block unsupported combinations with explainers.
- Medium-detail formula popovers per cell.
- `react-chartjs-2` line chart:
  - X = monthly minutes
  - Y = monthly USD cost
  - focus + context styling
  - show/hide line toggles
- Slider-driven quote at minute value `N`.
- URL stores core comparison config only.

## ASCII Layout Diagram

```text
+----------------------------------------------------------------------------------+
| Header                                                                           |
| "LiveKit vs Pipecat Cost Comparison" + Short description                         |
+----------------------------------------------------------------------------------+
| Controls Row                                                                      |
| [Monthly Minutes Slider] [Scenario Toggles] [Show/Hide Stacks] [Reset]           |
+----------------------------------------------------------------------------------+
| Chart Panel (react-chartjs-2)                                                     |
| X: Usage Minutes  |  Y: Monthly Cost (USD)                                        |
| - Focus line highlighted                                                          |
| - Non-focused lines dimmed                                                        |
+----------------------------------------------------------------------------------+
| Comparison Table (Apple-style, up to 8 stack columns)                             |
| Row: Platform      | Stack A | Stack B | ... | Stack H                            |
| Row: Hosting       |         |         |     |                                    |
| Row: Pipeline      |         |         |     |                                    |
| Row: STT           |         |         |     |                                    |
| Row: LLM           |         |         |     |                                    |
| Row: TTS           |         |         |     |                                    |
| Row: Calls         |         |         |     |                                    |
| Row: Recording     |         |         |     |                                    |
| Row: Monthly Cost @N (from slider)                                                |
| Hover any cell -> popover with formula breakdown                                  |
+----------------------------------------------------------------------------------+
| Restriction Notes Row (informational only)                                        |
| Example: "LiveKit Ship plan has deployment limits"                                |
+----------------------------------------------------------------------------------+
| FAQ Section                                                                        |
| "App Service vs AKS: Recommended = <one>" + rationale + when to choose the other |
+----------------------------------------------------------------------------------+
```

```text
Data + Logic Flow

src/data/*.ts (pricing snapshots + compatibility + assumptions)
                 |
                 v
         Cost Engine (pure functions)
                 |
                 v
       UI State (URL core state + local view state)
                 |
                 v
     Chart + Table + Quote + FAQ Recommendation
```

## Azure Recommendation (FAQ Section)

- Show one recommendation output: "App Service" or "AKS".
- Decision factors:
  - long-term cost efficiency (primary)
  - reliable realtime performance
  - maintenance complexity
- Include concise rationale and when the alternative is preferable.

## Implementation Phases

1. Foundation: scaffold app + dependencies + data schemas.
2. Calculator core: deterministic formulas + plan optimizer + tests.
3. UI: table editors, popovers, chart, toggles, slider quote.
4. Finalization: URL sync, restriction row, FAQ recommendation, QA.

## Testing + Governance

- Unit tests for formulas, tier thresholds, discounts, plan selection.
- Integration checks for table->chart->quote consistency.
- Golden fixtures at 1k/5k/10k/50k/100k monthly minutes.
- Manual PR-based pricing updates with verification date tracking.

