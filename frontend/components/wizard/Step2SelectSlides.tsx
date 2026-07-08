import { useWizardStore } from "@/store/useWizardStore";
import { SLIDE_CATALOG } from "@/lib/catalog/slides";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { Check, Square, Trash2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Step2SelectSlides() {
  const { 
    selectedSlideIds, 
    toggleSlide, 
    selectAllSlides, 
    deselectAllSlides, 
    resetSlides, 
    prevStep, 
    nextStep 
  } = useWizardStore();

  const handleNext = () => {
    if (selectedSlideIds.length === 0) return;
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Select Slides</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedSlideIds.length} of {SLIDE_CATALOG.length} slides selected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAllSlides} className="gap-2">
            <Check className="h-4 w-4" /> Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAllSlides} className="gap-2">
            <Square className="h-4 w-4" /> Clear All
          </Button>
          <Button variant="outline" size="sm" onClick={resetSlides} className="gap-2">
            <Undo2 className="h-4 w-4" /> Reset Default
          </Button>
        </div>
      </div>

      {selectedSlideIds.length === 0 && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm font-medium">
          You must select at least one slide to generate a report.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {SLIDE_CATALOG.map((slide) => {
          const isSelected = selectedSlideIds.includes(slide.id);
          
          return (
            <div 
              key={slide.id}
              onClick={() => toggleSlide(slide.id)}
              className={cn(
                "relative group flex flex-col rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
                isSelected 
                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                  : "border-border/50 bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                  isSelected 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : "border-input bg-transparent"
                )}>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </div>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  #{slide.position}
                </span>
              </div>
              
              <h4 className="font-semibold text-sm mb-3 flex-1">{slide.name}</h4>
              
              <div className="flex flex-wrap gap-2 mt-auto">
                <DataSourceBadge type={slide.dataSource} />
                {slide.requiresAI && <DataSourceBadge type="ai" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-border/50">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={selectedSlideIds.length === 0}>
          Continue to Reorder
        </Button>
      </div>
    </div>
  );
}
