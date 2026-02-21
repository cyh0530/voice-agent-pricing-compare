import { useState, useCallback, useEffect, useMemo } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/components/Header';
import { MinutesSlider } from '@/components/MinutesSlider';
import { CostChart } from '@/components/CostChart';
import { ComparisonTable } from '@/components/ComparisonTable';
import { RestrictionNotes } from '@/components/RestrictionNotes';
import { FAQ } from '@/components/FAQ';
import { DEFAULT_STACKS, DEFAULT_MONTHLY_MINUTES, createNewStack } from '@/data/defaults';
import { calculateCost } from '@/lib/cost-engine';
import { decodeState, pushState } from '@/lib/url-state';
import { CHART_COLORS } from '@/data/compatibility';
import { ExternalLink, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StackConfig } from '@/data/types';

function App() {
  // Initialize from URL or defaults
  const [stacks, setStacks] = useState<StackConfig[]>(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const decoded = decodeState(search);
    return decoded?.stacks ?? DEFAULT_STACKS;
  });

  const [monthlyMinutes, setMonthlyMinutes] = useState(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const decoded = decodeState(search);
    return decoded?.monthlyMinutes ?? DEFAULT_MONTHLY_MINUTES;
  });

  const [focusedStackId, setFocusedStackId] = useState<string | null>(null);

  // Sync to URL
  useEffect(() => {
    pushState(stacks, monthlyMinutes);
  }, [stacks, monthlyMinutes]);

  const updateStack = useCallback((id: string, updates: Partial<StackConfig>) => {
    setStacks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const removeStack = useCallback((id: string) => {
    setStacks((prev) => prev.filter((s) => s.id !== id));
    setFocusedStackId((prev) => (prev === id ? null : prev));
  }, []);

  const addStack = useCallback(() => {
    setStacks((prev) => {
      if (prev.length >= 8) return prev;
      return [...prev, createNewStack(prev.length)];
    });
  }, []);

  const resetAll = useCallback(() => {
    setStacks(DEFAULT_STACKS);
    setMonthlyMinutes(DEFAULT_MONTHLY_MINUTES);
    setFocusedStackId(null);
  }, []);

  // Quick cost summary at current slider value
  const summaryCards = useMemo(() => {
    return stacks
      .filter((s) => s.visible)
      .map((s, i) => ({
        id: s.id,
        label: s.label,
        color: CHART_COLORS[stacks.indexOf(s) % CHART_COLORS.length],
        total: calculateCost(s, monthlyMinutes).total,
        perMinute: monthlyMinutes > 0 ? calculateCost(s, monthlyMinutes).total / monthlyMinutes : 0,
      }))
      .sort((a, b) => a.total - b.total);
  }, [stacks, monthlyMinutes]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 sm:py-10 space-y-8">
          {/* Controls */}
          <section className="animate-fade-in rounded-xl border border-border bg-card/50 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div />
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAll}
                className="gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
            <MinutesSlider value={monthlyMinutes} onChange={setMonthlyMinutes} />

            {/* Quick cost cards */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {summaryCards.map((card, idx) => (
                <button
                  key={card.id}
                  onClick={() => setFocusedStackId(focusedStackId === card.id ? null : card.id)}
                  className={`group relative rounded-lg border px-3 py-2.5 text-left transition-all cursor-pointer ${
                    focusedStackId === card.id
                      ? 'border-border-light bg-accent/50'
                      : 'border-border/40 bg-transparent hover:bg-accent/30'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {idx === 0 && (
                    <span className="absolute -top-2.5 right-2 inline-flex items-center gap-1 rounded-full bg-neon/10 border border-neon/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-neon uppercase tracking-wider">
                      <Trophy className="h-3 w-3" />
                      Cheapest
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: card.color }} />
                    <span className="text-sm text-muted-foreground truncate">{card.label}</span>
                  </div>
                  <div className="font-mono text-xl font-bold tabular-nums" style={{ color: card.color }}>
                    ${card.total.toFixed(2)}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">
                    ${card.perMinute.toFixed(4)}/min
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Chart */}
          <section>
            <CostChart
              stacks={stacks}
              monthlyMinutes={monthlyMinutes}
              focusedStackId={focusedStackId}
              onFocusStack={setFocusedStackId}
            />
          </section>

          {/* Comparison Table */}
          <section>
            <ComparisonTable
              stacks={stacks}
              monthlyMinutes={monthlyMinutes}
              focusedStackId={focusedStackId}
              onUpdateStack={updateStack}
              onRemoveStack={removeStack}
              onAddStack={addStack}
              onFocusStack={setFocusedStackId}
            />
          </section>

          {/* Restriction Notes */}
          <section>
            <RestrictionNotes />
          </section>

          {/* FAQ */}
          <section>
            <FAQ />
          </section>

          {/* Pricing Sources */}
          <section className="rounded-xl border border-border bg-card/50 p-4 sm:p-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Pricing Sources</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'LiveKit Cloud', href: 'https://livekit.io/pricing' },
                { label: 'LiveKit Inference', href: 'https://livekit.io/pricing/inference' },
                { label: 'Pipecat Cloud', href: 'https://www.daily.co/pricing/pipecat-cloud/' },
                { label: 'Daily WebRTC', href: 'https://www.daily.co/pricing/webrtc-infrastructure/' },
                { label: 'Deepgram', href: 'https://deepgram.com/pricing' },
                { label: 'AssemblyAI', href: 'https://www.assemblyai.com/pricing' },
                { label: 'Cartesia', href: 'https://cartesia.ai/pricing' },
                { label: 'ElevenLabs', href: 'https://elevenlabs.io/pricing' },
                { label: 'OpenAI Realtime', href: 'https://developers.openai.com/api/docs/models/gpt-realtime' },
                { label: 'Gemini Live', href: 'https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-native-audio' },
                { label: 'Azure', href: 'https://azure.microsoft.com/en-us/pricing/' },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-accent/30 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border transition-all"
                >
                  {label}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 bg-card/30">
          <div className="mx-auto max-w-[1440px] px-6 py-5 sm:px-8 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Pricing snapshot as of Feb 2026. Not affiliated with LiveKit or Daily/Pipecat.
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export default App;
