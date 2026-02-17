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
import { RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StackConfig } from '@/data/types';

function App() {
  // Initialize from URL or defaults
  const [stacks, setStacks] = useState<StackConfig[]>(() => {
    const decoded = decodeState(window.location.search);
    return decoded?.stacks ?? DEFAULT_STACKS;
  });

  const [monthlyMinutes, setMonthlyMinutes] = useState(() => {
    const decoded = decodeState(window.location.search);
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
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 bg-card/30">
          <div className="mx-auto max-w-[1440px] px-6 py-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Pricing snapshot as of Feb 2026. Not affiliated with LiveKit or Daily/Pipecat.
            </p>
            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              <a href="https://livekit.io/pricing" target="_blank" rel="noopener" className="hover:text-neon transition-colors">LiveKit Pricing</a>
              <a href="https://www.daily.co/pricing/pipecat-cloud/" target="_blank" rel="noopener" className="hover:text-violet transition-colors">Pipecat Pricing</a>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export default App;
