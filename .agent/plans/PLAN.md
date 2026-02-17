# LiveKit vs Pipecat Cost Comparison Website Plan

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

## Information Architecture

- `Home`: chart + stack comparison table + slider controls + restriction notes + FAQ.
- `Data`: static pricing and compatibility catalogs in `*.ts`.
- `Calculator`: deterministic pure functions for cost outputs.
- `State`: URL-backed comparison configuration and local UI state.

## Data Model (TypeScript)

Create strongly-typed catalog modules:

- `src/data/pricing/livekit.ts`
- `src/data/pricing/pipecat.ts`
- `src/data/pricing/providers.ts`
- `src/data/compatibility.ts`
- `src/data/restrictions.ts`
- `src/data/assumptions.ts`

Recommended shapes:

- `PricingSnapshotMeta`: `sourceUrl[]`, `lastVerifiedAt`, `notes`.
- `PlanTier`: included usage, overage rates, tier thresholds, discounts.
- `ProviderRate`: per-minute/per-token/per-character rate normalized into calculator units.
- `StackConfig`: one comparison column definition.
- `CompatibilityRule`: valid platform/hosting/pipeline/provider combinations.
- `RestrictionNote`: display-only constraints by platform plan.

## Cost Engine Design

Implement pure functions in `src/lib/cost/`:

- `normalizeInputs(config, assumptions)`
- `computeProviderCost(config, monthlyMinutes)`
- `computePlatformCost(config, monthlyMinutes)`
- `computeRecordingCost(config, monthlyMinutes)`
- `computeTotalCost(config, monthlyMinutes)`
- `selectBestPlanWithHeadroom(candidatePlans, usageProfile)`

### Calculation Rules

- LiveKit Cloud:
  - evaluate all non-enterprise plan tiers + included usage + PAYG
  - choose lowest monthly total with headroom objective
- Pipecat Cloud:
  - use Agent-1x assumptions
  - include Daily WebRTC transport
  - apply Daily volume discounts where tiered
- Self-hosted (Azure):
  - model compute/network baseline from autoscaling assumptions
  - use flat traffic profile for v1
  - maintain separate formulas for App Service and AKS for recommendation logic
- Providers:
  - STT: AssemblyAI, Cartesia, Deepgram, ElevenLabs only
  - LLM: pinned latest OpenAI and Gemini model IDs at release
  - TTS: Cartesia and ElevenLabs only

## UI/UX Specification

### Comparison Table

- Apple-compare-style column layout.
- Up to 8 stacks.
- Controls are dropdowns with hard validation.
- Invalid choices are disabled with reason tooltip/text.
- Hover popovers show medium-level formula breakdown:
  - component subtotal
  - included usage handling
  - overage calculation
  - final monthly subtotal

### Chart

- Use `react-chartjs-2` line chart.
- X-axis: usage minutes.
- Y-axis: monthly USD cost.
- Focus + context:
  - selected stack is highlighted
  - non-focused stacks are dimmed
- Show/hide toggles for each line.

### Slider + Instant Quote

- Slider for monthly minute value `N`.
- Show per-stack monthly total at `N`.
- Recording mode reflected in quote logic.

### URL State

Encode only core state:

- stack definitions (up to 8)
- usage slider value
- primary scenario flags needed to reproduce results

Keep visual-only preferences local (e.g., temporary hover/focus state).

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

## Azure Recommendation Module (Bottom FAQ)

Render one recommendation outcome ("App Service" OR "AKS") and explain why.

Decision basis:

- primary: long-term cost efficiency
- secondary: reliable realtime performance
- tertiary: maintenance complexity

Implementation approach:

- compute recommendation from current scenario assumptions (usage + complexity)
- output one winner + concise explanation + "when to choose the other option" note
- place in bottom FAQ section as requested

## Repo/Code Structure (Proposed)

- `src/components/comparison/` (table, column editor, popovers)
- `src/components/chart/` (line chart, legend, focus controls)
- `src/components/faq/` (Azure recommendation FAQ)
- `src/lib/cost/` (all pricing calculators)
- `src/lib/url-state/` (encode/decode core comparison state)
- `src/data/` (pricing catalogs, assumptions, restrictions, compatibility)
- `src/routes/` (TanStack Start route entry)

## Implementation Phases

### Phase 1: Foundation

- initialize app scaffolding with required stack
- install chart + UI dependencies
- define TypeScript domain types and seed snapshot pricing files
- build compatibility and restrictions catalogs

### Phase 2: Calculator Core

- implement deterministic cost engine and plan selection logic
- add unit tests for:
  - tier transitions
  - included usage handling
  - volume discount correctness
  - best-plan selection with headroom

### Phase 3: Interactive UI

- build comparison table with up to 8 stacks
- add dropdowns and hard-block invalid combinations
- implement formula popovers (medium breakdown)
- implement chart with focus/dim + show/hide toggles
- add slider and instant quote outputs

### Phase 4: URL + FAQ + Hardening

- add URL encode/decode for core state
- add restriction sidenote row
- implement bottom FAQ Azure recommendation (single winner output)
- optimize bundle/render performance for GitHub Pages
- finalize content and QA

## Testing Strategy

- Unit tests: cost engine, compatibility validator, URL encode/decode.
- Integration tests: table edits -> chart updates -> quote accuracy.
- Golden test fixtures:
  - 1k, 5k, 10k, 50k, 100k monthly minutes
  - audio-only vs audio+video
  - recording permutations in v1 scope
- Manual QA checklist:
  - URL sharing reproduces same core config
  - invalid combinations cannot be selected
  - popovers match calculator output
  - chart remains readable at 8 stacks via toggles/focus

## Risk Register

- Pricing drift from provider updates -> mitigate with `lastVerifiedAt`, manual PR cadence.
- Ambiguous provider unit semantics -> mitigate via explicit normalization layer.
- Formula complexity impacting trust -> mitigate via popover breakdown and deterministic outputs.
- Frontend-only payload growth -> mitigate with typed modular pricing files and selective loading patterns.

## Assumption Ledger (Initial)

- Flat monthly traffic profile.
- Single average session duration.
- USD pre-tax output only.
- Provider-only recording cost scope.
- No uncertainty/range output in UI.
- Restrictions are informational, not recommendation penalties.
- Live pricing updates are manual, PR-driven.

## Deliverables

- Detailed plan document (`PLAN.md` mirror).
- Typed pricing data schema + seeded snapshot catalogs.
- Cost engine with tests.
- Interactive comparison UI + chart + URL state.
- FAQ recommendation section for App Service vs AKS.

