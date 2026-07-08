import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useWizardStore } from "@/store/useWizardStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ClientConfig } from "@/lib/config/clientRepository";
import { SLIDE_CATALOG } from "@/lib/catalog/slides";
import { SUPPORTED_LLM_MODELS } from "@/lib/pipeline/models";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  FileBox, 
  Download,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Step4Props {
  clients: ClientConfig[];
}

type PipelineStage = 
  | 'idle' 
  | 'initializing' 
  | 'collecting' 
  | 'processing' 
  | 'generating_charts' 
  | 'ai_insights' 
  | 'building_pptx' 
  | 'done' 
  | 'error';

export function Step4Generate({ clients }: Step4Props) {
  const { config, orderedSlideIds, prevStep, nextStep } = useWizardStore();
  const [expandedSlides, setExpandedSlides] = useState(false);
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated' | 'unknown'>('checking');

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (data.authenticated === true) {
          setAuthStatus('authenticated');
        } else if (data.missingCredentials === true || data.authenticated === false) {
          setAuthStatus('unauthenticated');
        } else {
          setAuthStatus('unknown');
        }
      } catch (e) {
        setAuthStatus('unknown');
      }
    }
    checkAuth();
  }, []);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const { customModels } = useSettingsStore();

  const client = useMemo(() => clients.find(c => c.key === config.clientKey), [clients, config.clientKey]);
  const allModels = useMemo(() => [...SUPPORTED_LLM_MODELS, ...customModels], [customModels]);
  const modelName = useMemo(() => allModels.find(m => m.id === config.llmModel)?.name, [config.llmModel, allModels]);
  
  const slidesMap = useMemo(() => {
    const map = new Map();
    SLIDE_CATALOG.forEach(s => map.set(s.id, s));
    return map;
  }, []);

  const visibleSlides = expandedSlides ? orderedSlideIds : orderedSlideIds.slice(0, 10);
  const remainingCount = orderedSlideIds.length - 10;

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/status');
        if (!res.ok) {
          setAuthStatus('unknown');
          return;
        }
        const data = await res.json();
        if (data.authenticated === true) {
          setAuthStatus('authenticated');
        } else if (data.missingCredentials === true || data.authenticated === false) {
          setAuthStatus('unauthenticated');
        } else {
          setAuthStatus('unknown');
        }
      } catch (e) {
        setAuthStatus('unknown');
      }
    }
    checkAuth();
  }, []);

  const cancelGeneration = async () => {
    if (abortController) {
      abortController.abort();
    }
    try {
      await fetch('/api/generate/cancel', { method: 'DELETE' });
    } catch (e) {}
    setStage('idle');
    setErrorDetails(null);
  };

  const startGeneration = async () => {
    setStage('initializing');
    setErrorDetails(null);
    setReportUrl(null);
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: config.clientKey,
          useRealData: config.useRealData,
          useAiInsights: config.useAiInsights,
          slideList: orderedSlideIds
        })
      });

      if (!response.ok) {
        throw new Error("Failed to start generation pipeline");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No reader available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.type === 'progress') {
                // Map backend step names to our frontend states
                if (data.step === 'COLLECT_GSC' || data.step === 'COLLECT_GA4' || data.step === 'COLLECT_PAGESPEED') {
                  setStage('collecting');
                } else if (data.step === 'BUILD_DATA') {
                  setStage('processing');
                } else if (data.step === 'GENERATE_CHARTS') {
                  setStage('generating_charts');
                } else if (data.step === 'GENERATE_INSIGHTS') {
                  setStage('ai_insights');
                } else if (data.step === 'BUILD_PPTX') {
                  setStage('building_pptx');
                }
              } else if (data.type === 'result') {
                if (data.success) {
                  setStage('done');
                  
                  // Extract the basename from the absolute path to serve it securely, 
                  // or provide an API route to download it.
                  // For now, we store the metadata in the store and advance to Step 5.
                  const fileName = data.output_path.split(/[\/\\]/).pop();
                  setReportUrl(`/api/download/${config.clientKey}/${fileName}`);
                  useWizardStore.setState({ 
                    reportMetadata: {
                      id: fileName,
                      client_key: config.clientKey,
                      month: config.month,
                      slide_list: orderedSlideIds,
                      model_used: config.llmModel,
                      generated_at: new Date().toISOString(),
                      file_size_mb: data.file_size_mb || 0,
                      file_path: data.output_path
                    }
                  });
                  nextStep(); // Advance to Step 5 Complete
                  return;
                } else {
                  throw new Error(data.error_message || "Pipeline failed");
                }
              }
            } catch (e) {
              // Ignore parse errors on partial chunks
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setStage('error');
      setErrorDetails(err.message || "An unknown error occurred during generation.");
      toast.error("Pipeline failed.");
    }
  };

  const getStageIcon = (currentStage: string, targetStage: string[]) => {
    const stageOrder = ['idle', 'initializing', 'collecting', 'processing', 'generating_charts', 'ai_insights', 'building_pptx', 'done'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const targetIndex = Math.max(...targetStage.map(s => stageOrder.indexOf(s)));
    
    if (stage === 'error' && currentStage === targetStage[0]) return <AlertCircle className="h-5 w-5 text-destructive" />;
    if (currentIndex > targetIndex) return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (currentIndex === targetIndex) return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    return <Circle className="h-5 w-5 text-muted-foreground/30" />;
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      {/* Left Column: Summary */}
      <div className="lg:col-span-5 space-y-6">
        <div>
          <h2 className="text-xl font-bold">Review & Generate</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verify your configuration before starting the pipeline.
          </p>
        </div>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
            <CardTitle className="text-lg">Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="text-muted-foreground">Client</div>
              <div className="font-medium text-right">{client?.name || "Unknown"}</div>
              
              <div className="text-muted-foreground">Month</div>
              <div className="font-medium text-right">{config.month}</div>
              
              <div className="text-muted-foreground">Total Slides</div>
              <div className="font-medium text-right">{orderedSlideIds.length} slides</div>
              
              <div className="text-muted-foreground">Data Source</div>
              <div className="font-medium text-right">
                {config.useRealData ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Live API Data</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Mock Data</span>
                )}
              </div>
              
              <div className="text-muted-foreground">AI Insights</div>
              <div className="font-medium text-right">
                {config.useAiInsights ? (
                  <span className="text-primary">{modelName}</span>
                ) : (
                  <span className="text-muted-foreground">Disabled</span>
                )}
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-border/50">
              <h4 className="text-sm font-medium mb-3">Slide Order</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                {visibleSlides.map(id => (
                  <li key={id} className="truncate">{slidesMap.get(id)?.name}</li>
                ))}
              </ol>
              
              {remainingCount > 0 && !expandedSlides && (
                <button 
                  onClick={() => setExpandedSlides(true)}
                  className="text-xs text-primary hover:underline mt-2 font-medium"
                >
                  + {remainingCount} more slides
                </button>
              )}
              {expandedSlides && remainingCount > 0 && (
                <button 
                  onClick={() => setExpandedSlides(false)}
                  className="text-xs text-primary hover:underline mt-2 font-medium"
                >
                  Show less
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {stage === 'idle' || stage === 'error' ? (
          <div className="space-y-4">
            {authStatus === 'unauthenticated' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Google authentication required</AlertTitle>
                <AlertDescription className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>Connect your Google account before generating a report.</span>
                  <Link href="/authenticate" className="text-sm font-semibold underline underline-offset-2">
                    Go to Authentication page
                  </Link>
                </AlertDescription>
              </Alert>
            )}
            
            {authStatus === 'unknown' && (
              <Alert className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/50">
                <AlertCircle className="h-4 w-4 !text-amber-600" />
                <AlertTitle>Authentication status unknown</AlertTitle>
                <AlertDescription>
                  We could not verify your authentication status, but you can try to proceed.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={prevStep} disabled={stage !== 'idle' && stage !== 'error'}>
                Back
              </Button>
              <Button 
                onClick={startGeneration} 
                disabled={authStatus === 'checking' || authStatus === 'unauthenticated'}
                className={cn("flex-1 gap-2", stage === 'error' && "bg-amber-600 hover:bg-amber-700")}
              >
                {authStatus === 'checking' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : stage === 'error' ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {authStatus === 'checking' 
                  ? "Checking Authentication..." 
                  : stage === 'error' 
                  ? "Retry Generation" 
                  : "Start Generation Pipeline"}
              </Button>
            </div>
          </div>
        ) : stage !== 'done' ? (
          <div className="flex items-center gap-3">
            <Button variant="destructive" onClick={cancelGeneration} className="w-full gap-2">
              Cancel Generation
            </Button>
          </div>
        ) : null}
      </div>

      {/* Right Column: Execution */}
      <div className="lg:col-span-7">
        <Card className="shadow-sm border-border/50 h-full flex flex-col">
          <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
            <CardTitle className="text-lg">Pipeline Execution</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col">
            
            {stage === 'idle' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <FileBox className="h-12 w-12 mb-4 opacity-20" />
                <p>Click "Start Generation Pipeline" to begin.</p>
                <p className="text-sm mt-2 opacity-70">The process typically takes 1-3 minutes depending on data volume.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className={cn("flex items-center gap-3", stage === 'initializing' ? "text-foreground" : "text-muted-foreground")}>
                    {getStageIcon(stage, ['initializing'])}
                    <span className="font-medium">Initializing Pipeline</span>
                  </div>
                  
                  <div className={cn("flex items-center gap-3", stage === 'collecting' ? "text-foreground" : "text-muted-foreground")}>
                    {getStageIcon(stage, ['collecting'])}
                    <span className="font-medium">Collecting Data (GSC & GA4)</span>
                  </div>

                  <div className={cn("flex items-center gap-3", stage === 'collecting' ? "text-foreground" : "text-muted-foreground")}>
                    {getStageIcon(stage, ['collecting'])}
                    <span className="font-medium">Collecting Core Web Vitals (PageSpeed)</span>
                  </div>
                  
                  <div className={cn("flex items-center gap-3", stage === 'processing' ? "text-foreground" : "text-muted-foreground")}>
                    {getStageIcon(stage, ['processing'])}
                    <span className="font-medium">Processing & Formatting Data</span>
                  </div>
                  
                  <div className={cn("flex items-center gap-3", stage === 'generating_charts' ? "text-foreground" : "text-muted-foreground")}>
                    {getStageIcon(stage, ['generating_charts'])}
                    <span className="font-medium">Generating Visualizations</span>
                  </div>
                  
                  {config.useAiInsights && (
                    <div className={cn("flex items-center gap-3", stage === 'ai_insights' ? "text-foreground" : "text-muted-foreground")}>
                      {getStageIcon(stage, ['ai_insights'])}
                      <span className="font-medium">Synthesizing AI Insights ({modelName})</span>
                    </div>
                  )}
                  
                  <div className={cn("flex items-center gap-3", stage === 'building_pptx' ? "text-foreground" : "text-muted-foreground")}>
                    {getStageIcon(stage, ['building_pptx'])}
                    <span className="font-medium">Building PowerPoint Presentation</span>
                  </div>
                </div>

                {stage === 'error' && (
                  <Alert variant="destructive" className="mt-8 bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Pipeline Failed</AlertTitle>
                    <AlertDescription className="mt-2">
                      <p>The report generation was interrupted due to an error.</p>
                      
                      <button 
                        onClick={() => setShowErrorDetails(!showErrorDetails)}
                        className="flex items-center gap-1 text-xs font-semibold mt-3 hover:underline"
                      >
                        {showErrorDetails ? "Hide Technical Details" : "Show Technical Details"}
                        {showErrorDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      
                      {showErrorDetails && (
                        <pre className="mt-2 p-3 bg-black/10 dark:bg-black/40 rounded text-[10px] overflow-auto whitespace-pre-wrap max-h-32 font-mono">
                          {errorDetails}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {stage === 'done' && (
                  <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center animate-in fade-in zoom-in duration-500">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-2">Report Ready</h3>
                    <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mb-6">
                      Successfully generated a {orderedSlideIds.length}-slide presentation for {client?.name}.
                    </p>
                    <a 
                      href={reportUrl || "#"} 
                      download
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2"
                    >
                      <Download className="h-4 w-4" /> Download PPTX
                    </a>
                  </div>
                )}
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

