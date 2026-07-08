import { Badge } from "@/components/ui/badge";
import { Search, LineChart, Settings, Zap, Sparkles } from "lucide-react";

type DataSource = 'gsc' | 'ga4' | 'config' | 'pagespeed' | 'ai';

interface DataSourceBadgeProps {
  type: DataSource;
}

const config = {
  gsc: {
    label: "Search Console",
    icon: Search,
    colorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  ga4: {
    label: "Google Analytics 4",
    icon: LineChart,
    colorClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  config: {
    label: "Configuration",
    icon: Settings,
    colorClass: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800",
  },
  pagespeed: {
    label: "PageSpeed Insights",
    icon: Zap,
    colorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  ai: {
    label: "AI Generated",
    icon: Sparkles,
    colorClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  }
};

export function DataSourceBadge({ type }: DataSourceBadgeProps) {
  const { label, icon: Icon, colorClass } = config[type];
  
  return (
    <Badge variant="outline" className={`gap-1.5 px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
