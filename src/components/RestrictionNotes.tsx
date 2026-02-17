import { Info } from 'lucide-react';
import { RESTRICTIONS } from '@/data/pricing';

export function RestrictionNotes() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <Info className="h-5 w-5 text-amber" />
        <h3 className="text-base font-semibold text-foreground">Platform Restrictions & Notes</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RESTRICTIONS.map((r, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-lg bg-secondary/50 px-4 py-3"
          >
            <span className="text-xs font-mono text-amber whitespace-nowrap shrink-0 mt-0.5">
              {r.platform}{r.plan ? ` · ${r.plan}` : ''}
            </span>
            <p className="text-sm text-muted-foreground leading-relaxed">{r.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
