import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Server, HelpCircle } from 'lucide-react';

export function FAQ() {
  return (
    <div className="space-y-6">
      {/* Azure Recommendation */}
      <div className="rounded-xl border border-violet/20 bg-violet-dim/30 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-dim border border-violet/20 shrink-0">
            <Server className="h-5 w-5 text-violet" />
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Self-Hosting: Why AKS over App Service
              </h3>
              <p className="text-base text-muted-foreground mt-1">
                This calculator uses Azure Kubernetes Service (AKS) for all self-hosted estimates.
              </p>
            </div>

            <div className="rounded-lg border border-neon/20 bg-neon-dim/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center rounded-full bg-neon/10 px-2.5 py-1 text-xs font-mono font-semibold text-neon uppercase tracking-wider">
                  Recommended
                </span>
                <span className="font-semibold text-foreground text-base">Azure Kubernetes Service (AKS)</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Voice agents require <strong className="text-foreground/90">one process per bot</strong> for
                resource isolation (per Pipecat team guidance). Kubernetes is a natural fit for this pattern —
                each bot runs as its own pod with isolated memory, CPU limits, and health checks. The cluster
                autoscaler adds or removes nodes based on pending pods, so you only pay for the compute you need.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon" /> One pod per bot — native process isolation without manual process management
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon" /> Cluster autoscaler matches node count to real-time demand
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon" /> Graceful pod draining — bots finish their session before shutdown
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon" /> Liveness &amp; readiness probes auto-restart unhealthy bots
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon" /> Control plane $73/mo + D2s_v3 nodes at $70/mo (~6 bots/node)
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/30 p-5">
              <h4 className="font-semibold text-foreground/80 text-sm">Why not App Service?</h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                App Service can host voice agents, but you'd need to manage multiple bot processes
                within each instance yourself (e.g., via supervisord). There's no built-in concept of
                "one unit of work = one process" — scaling is per-instance, not per-bot. You also lose
                health-check-per-bot, graceful session draining, and fine-grained resource limits.
                For production voice agents, AKS's pod-per-bot model is a better architectural fit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-display text-lg font-semibold">Frequently Asked Questions</h3>
        </div>
        <Accordion type="multiple" className="space-y-1">
          <AccordionItem value="assumptions" className="border-border/30">
            <AccordionTrigger className="text-base hover:text-neon transition-colors py-4">
              What assumptions does the calculator make?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
              <ul className="space-y-2 mt-1">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <span><strong className="text-foreground/90">STT duty cycle:</strong> 70% — user speaks ~70% of session time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <span><strong className="text-foreground/90">TTS duty cycle:</strong> 30% — agent speaks ~30% of session time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <span><strong className="text-foreground/90">TTS output rate:</strong> ~900 characters/min (~150 words at 6 chars/word)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <span><strong className="text-foreground/90">LLM input tokens:</strong> ~800/min (conversation context grows over session)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <span><strong className="text-foreground/90">LLM output tokens:</strong> ~400/min (agent response tokens)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <span><strong className="text-foreground/90">Cache hit rate:</strong> 30% of input tokens served from cache</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <span><strong className="text-foreground/90">Average session:</strong> 10 minutes (for Azure compute sizing)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <span><strong className="text-foreground/90">Recording storage:</strong> ~0.5 MB/min audio, ~5 MB/min video (Azure Blob)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                  <span><strong className="text-foreground/90">Pricing:</strong> USD pre-tax, snapshot as of February 2026</span>
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="plan-optimizer" className="border-border/30">
            <AccordionTrigger className="text-base hover:text-neon transition-colors py-4">
              How does plan optimization work?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
              For LiveKit Cloud, the calculator evaluates Ship ($50/mo) and Scale ($500/mo)
              plans. It selects the plan that results in the lowest total cost including the base fee
              plus any overage charges. The Scale plan also includes inference discounts on STT and TTS.
              Daily WebRTC applies automatic tiered volume discounts based on monthly participant minutes.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="self-hosted" className="border-border/30">
            <AccordionTrigger className="text-base hover:text-neon transition-colors py-4">
              What does self-hosted include?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
              Self-hosted costs include Azure AKS compute (control plane + D2s_v3 worker nodes),
              plus direct provider costs for STT/LLM/TTS. Each bot runs as its own Kubernetes pod.
              For Pipecat self-hosted, you still use Daily WebRTC for transport (with volume discounts).
              For LiveKit self-hosted, the open-source media server runs on your Azure infrastructure.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="speech-to-speech" className="border-border/30">
            <AccordionTrigger className="text-base hover:text-neon transition-colors py-4">
              What are speech-to-speech models?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
              Speech-to-speech (S2S) models like OpenAI Realtime API and Gemini Live handle the
              entire voice pipeline in a single model -- no separate STT, LLM, or TTS needed.
              This typically offers lower latency but at a higher per-minute cost.
              When S2S is selected, only the S2S model cost is calculated instead of individual
              STT + LLM + TTS costs.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="accuracy" className="border-border/30">
            <AccordionTrigger className="text-base hover:text-neon transition-colors py-4">
              How accurate are these estimates?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
              Pricing data is sourced directly from provider websites as of February 2026.
              Actual costs may vary based on your specific conversation patterns (token usage,
              speech rate), negotiated enterprise rates, and provider pricing changes. This
              tool provides directional estimates for comparison purposes.
              Hover over any cost cell to see the exact formula used.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
