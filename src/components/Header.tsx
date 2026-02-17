import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="relative border-b border-border/60 bg-card/50 backdrop-blur-sm">
      <div className="mx-auto max-w-[1440px] px-6 py-6 sm:px-8 md:py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-dim border border-neon/20">
                <Activity className="h-5 w-5 text-neon" />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Voice Agent Cost Compare
              </h1>
            </div>
            <p className="max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
              Compare monthly costs between <span className="text-neon font-medium">LiveKit</span> and{' '}
              <span className="text-violet font-medium">Pipecat</span> across usage tiers.
              Cloud vs self-hosted, transparent formulas, shareable URLs.
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neon-dim border border-neon/20 px-3.5 py-1.5 text-sm font-mono text-neon">
              <span className="h-2 w-2 rounded-full bg-neon animate-pulse" />
              USD pre-tax
            </span>
            <span className="inline-flex items-center rounded-full bg-secondary px-3.5 py-1.5 text-sm font-mono text-muted-foreground">
              Feb 2026
            </span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-neon/30 to-transparent" />
    </header>
  );
}
