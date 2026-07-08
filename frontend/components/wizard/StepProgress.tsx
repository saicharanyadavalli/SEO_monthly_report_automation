import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
}

const STEPS = [
  "Configure",
  "Select Slides",
  "Reorder",
  "Generate",
  "Complete",
];

export function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <div className="w-full">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center">
          {STEPS.map((step, index) => {
            const stepIdx = index + 1;
            const isCompleted = currentStep > stepIdx;
            const isCurrent = currentStep === stepIdx;
            
            return (
              <li key={step} className={cn("relative pr-8 sm:pr-20", index === STEPS.length - 1 ? "pr-0 sm:pr-0" : "")}>
                {isCompleted ? (
                  <>
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="h-0.5 w-full bg-primary" />
                    </div>
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary hover:bg-primary/90 transition-colors">
                      <Check className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                      <span className="sr-only">{step}</span>
                    </div>
                  </>
                ) : isCurrent ? (
                  <>
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="h-0.5 w-full bg-muted" />
                    </div>
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background" aria-current="step">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                      <span className="sr-only">{step}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="h-0.5 w-full bg-muted" />
                    </div>
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted bg-background hover:border-muted-foreground transition-colors">
                      <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                      <span className="sr-only">{step}</span>
                    </div>
                  </>
                )}
                <span 
                  className={cn(
                    "absolute -bottom-6 left-4 -translate-x-1/2 w-max text-xs font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
