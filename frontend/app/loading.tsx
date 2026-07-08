import { FileBarChart } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground animate-pulse">
      <FileBarChart className="h-12 w-12 mb-4 opacity-50" />
      <h3 className="text-lg font-medium text-foreground">Loading Dashboard...</h3>
    </div>
  );
}
