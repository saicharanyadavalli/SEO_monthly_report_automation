import { useState, useMemo, useEffect } from "react";
import { useWizardStore } from "@/store/useWizardStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ClientConfig } from "@/lib/config/clientRepository";
import { SUPPORTED_LLM_MODELS } from "@/lib/pipeline/models";
import { useAuth } from "@/hooks/useAuth";
import { format, subMonths } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Zap, Globe } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Step1Props {
  clients: ClientConfig[];
}

export function Step1Configure({ clients }: Step1Props) {
  const { config, updateConfig, nextStep } = useWizardStore();
  const { customModels } = useSettingsStore();
  const allModels = useMemo(() => [...SUPPORTED_LLM_MODELS, ...customModels], [customModels]);
  const { status, isLoading } = useAuth();
  
  const [selectedClient, setSelectedClient] = useState<ClientConfig | null>(
    clients.find(c => c.key === config.clientKey) || null
  );

  // Generate last 12 months (e.g. July 2026)
  const months = useMemo(() => {
    const result = [];
    const today = new Date();
    // Usually reports are for past months, so start from previous month
    for (let i = 1; i <= 12; i++) {
      const d = subMonths(today, i);
      result.push({
        label: format(d, "MMMM yyyy"),
        value: format(d, "yyyy-MM")
      });
    }
    return result;
  }, []);

  // Force disable useRealData if not authenticated
  useEffect(() => {
    if (!isLoading && !status?.authenticated && config.useRealData) {
      updateConfig({ useRealData: false });
    }
  }, [isLoading, status, config.useRealData, updateConfig]);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    const client = clients.find(c => c.key === key) || null;
    setSelectedClient(client);
    updateConfig({ clientKey: key });
  };

  const handleNext = () => {
    if (!config.clientKey) {
      toast.error("Please select a client to continue.");
      return;
    }
    if (!config.month) {
      toast.error("Please select a reporting month.");
      return;
    }
    nextStep();
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
        <CardDescription>Select the client, date range, and backend settings for this report.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* Client & Month */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="client" className="text-sm font-semibold">Client</Label>
            <div className="relative">
              <select 
                id="client"
                value={config.clientKey}
                onChange={handleClientChange}
                className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none pr-8 cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
              >
                <option value="" disabled>Select a client...</option>
                {clients.map(c => (
                  <option key={c.key} value={c.key}>{c.name}</option>
                ))}
              </select>
            </div>
            {selectedClient && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md border border-border/50 flex flex-col gap-1">
                <span className="flex items-center gap-2"><Globe className="h-3 w-3 text-muted-foreground" /> <strong>GSC:</strong> {selectedClient.gsc_url}</span>
                <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> <strong>GA4:</strong> {selectedClient.ga4_property_id || "Not configured"}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="month" className="text-sm font-semibold">Reporting Month</Label>
            <div className="relative">
              <select 
                id="month"
                value={config.month}
                onChange={(e) => updateConfig({ month: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none pr-8 cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
              >
                <option value="" disabled>Select a month...</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 space-y-6">
          <h4 className="text-sm font-semibold mb-4">Pipeline Settings</h4>
          
          <div className="p-4 border rounded-lg bg-card shadow-sm flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Use Real Data (GSC & GA4)</h4>
              <p className="text-xs text-muted-foreground">
                Connect to Google APIs to fetch live data. If disabled, mock data will be used.
              </p>
              
              {!isLoading && !status?.authenticated && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 p-2 rounded-md border border-amber-200 dark:border-amber-900/50">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>You must be authenticated to use real data. <Link href="/authenticate" className="underline font-medium hover:text-amber-700 dark:hover:text-amber-300">Authenticate here</Link>.</span>
                </div>
              )}
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input 
                type="checkbox" 
                checked={config.useRealData}
                onChange={(e) => updateConfig({ useRealData: e.target.checked })}
                className="sr-only peer" 
                disabled={isLoading || !status?.authenticated}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary opacity-50 peer-disabled:cursor-not-allowed peer-checked:opacity-100"></div>
            </label>
          </div>

          <div className="p-4 border rounded-lg bg-card shadow-sm flex items-start justify-between">
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Enable AI Insights</h4>
              <p className="text-xs text-muted-foreground">
                Run data through the LLM to generate natural language analysis on relevant slides.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input 
                type="checkbox" 
                checked={config.useAiInsights}
                onChange={(e) => updateConfig({ useAiInsights: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="space-y-3">
            <Label htmlFor="model" className="text-sm font-semibold">LLM Model</Label>
            <div className="relative max-w-sm">
              <select 
                id="model"
                value={config.llmModel}
                onChange={(e) => updateConfig({ llmModel: e.target.value })}
                disabled={!config.useAiInsights}
                className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%24%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
              >
                {allModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name} {customModels.some(c => c.id === m.id) ? '(Custom)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        <div className="flex items-center justify-end pt-6 border-t border-border/50">
          <Button onClick={handleNext}>
            Continue to Slides
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
