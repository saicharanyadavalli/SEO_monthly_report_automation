import { useState, useMemo } from "react";
import { useWizardStore } from "@/store/useWizardStore";
import { SLIDE_CATALOG } from "@/lib/catalog/slides";
import { Button } from "@/components/ui/button";
import { GripVertical, Undo2, ChevronDown, ChevronUp } from "lucide-react";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";

// Sortable item component
function SortableSlideItem({ id, slide, index }: { id: string, slide: any, index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-4 p-3 mb-2 rounded-lg border bg-card",
        isDragging ? "shadow-lg border-primary ring-1 ring-primary opacity-90" : "shadow-sm border-border/50 hover:border-border"
      )}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab hover:text-primary text-muted-foreground p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {index + 1}
          </span>
          <span className="font-medium text-sm truncate">{slide.name}</span>
        </div>
      </div>
      <div className="hidden sm:flex gap-2 shrink-0">
        <DataSourceBadge type={slide.dataSource} />
      </div>
    </div>
  );
}

export function Step3Reorder() {
  const { orderedSlideIds, reorderSlides, resetOrder, prevStep, nextStep } = useWizardStore();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedSlideIds.indexOf(active.id as string);
      const newIndex = orderedSlideIds.indexOf(over.id as string);
      reorderSlides(arrayMove(orderedSlideIds, oldIndex, newIndex));
    }
  };

  const slidesMap = useMemo(() => {
    const map = new Map();
    SLIDE_CATALOG.forEach(s => map.set(s.id, s));
    return map;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Reorder Slides</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Drag and drop to customize the presentation order.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetOrder} className="gap-2">
          <Undo2 className="h-4 w-4" /> Reset Default Order
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-background/50 border border-border/50 rounded-xl p-4">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={orderedSlideIds}
                strategy={verticalListSortingStrategy}
              >
                {orderedSlideIds.map((id, index) => (
                  <SortableSlideItem 
                    key={id} 
                    id={id} 
                    slide={slidesMap.get(id)} 
                    index={index} 
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
            <button 
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className="w-full flex items-center justify-between p-4 font-medium hover:bg-muted/50 transition-colors"
            >
              Preview Final Order
              {isPreviewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {isPreviewOpen && (
              <div className="p-4 pt-0 text-sm text-muted-foreground border-t border-border/50">
                <ol className="list-decimal pl-5 space-y-1 mt-3">
                  {orderedSlideIds.map(id => (
                    <li key={id} className="truncate" title={slidesMap.get(id)?.name}>
                      {slidesMap.get(id)?.name}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-border/50">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={nextStep}>
          Continue to Generate
        </Button>
      </div>
    </div>
  );
}
