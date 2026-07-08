import { useEffect, useRef } from "react";
import { useWizardStore } from "@/store/useWizardStore";
import { ClientConfig } from "@/lib/config/clientRepository";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, AlertCircle, RefreshCw, FileText, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Step5Props {
  clients: ClientConfig[];
}

export function Step5Complete({ clients }: Step5Props) {
  const { reportMetadata, resetWizard, updateConfig, prevStep } = useWizardStore();
  const router = useRouter();
  const downloadTriggered = useRef(false);

  const client = clients.find(c => c.key === reportMetadata?.client_key);

  useEffect(() => {
    if (reportMetadata?.id && !downloadTriggered.current) {
      downloadTriggered.current = true;
      // In a real app, this would be an API route like /api/download?path=...
      // For the sake of the UX simulation, we create a dummy link
      const link = document.createElement("a");
      link.href = "/api/download?path=" + encodeURIComponent(reportMetadata.file_path);
      link.download = reportMetadata.id;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [reportMetadata]);

  if (!reportMetadata) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card shadow-sm">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Report Missing</h2>
        <p className="text-muted-foreground mt-2 mb-6 max-w-md">
          We couldn't find the generated report data. The process might have failed or the session expired.
        </p>
        <Button onClick={prevStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Return to Generation
        </Button>
      </div>
    );
  }

  const handleSameClient = () => {
    resetWizard();
    updateConfig({ clientKey: client?.key || '' });
  };

  const handleDifferentClient = () => {
    resetWizard();
  };

  const handleHome = () => {
    resetWizard();
    router.push('/');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">Generation Complete!</h2>
        <p className="text-emerald-600/80 dark:text-emerald-400/80 mt-2 max-w-lg mx-auto">
          Your SEO report for {client?.name || reportMetadata.client_key} has been successfully generated and should begin downloading automatically.
        </p>
        
        <div className="mt-6 flex justify-center">
          <a 
            href={"/api/download?path=" + encodeURIComponent(reportMetadata.file_path)} 
            download={reportMetadata.id}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-lg inline-flex items-center justify-center rounded-md h-11 px-8 text-sm transition-colors"
          >
            <Download className="h-5 w-5" /> Download Report Now
          </a>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">Client</div>
            <div className="font-semibold truncate">{client?.name}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">Slides</div>
            <div className="font-semibold">{reportMetadata.slide_list.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">File Size</div>
            <div className="font-semibold">{reportMetadata.file_size_mb} MB</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-muted-foreground mb-1">Model</div>
            <div className="font-semibold truncate">{reportMetadata.model_used || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4 pt-6 border-t border-border/50">
        <button 
          onClick={handleSameClient}
          className="group flex flex-col items-center justify-center p-6 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
        >
          <RefreshCw className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-3" />
          <span className="font-semibold">Same Client</span>
          <span className="text-xs text-muted-foreground mt-1">New month or slides</span>
        </button>

        <button 
          onClick={handleDifferentClient}
          className="group flex flex-col items-center justify-center p-6 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
        >
          <FileText className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-3" />
          <span className="font-semibold">Different Client</span>
          <span className="text-xs text-muted-foreground mt-1">Start completely fresh</span>
        </button>

        <button 
          onClick={handleHome}
          className="group flex flex-col items-center justify-center p-6 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
        >
          <Home className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-3" />
          <span className="font-semibold">Return Home</span>
          <span className="text-xs text-muted-foreground mt-1">Go to dashboard</span>
        </button>
      </div>
    </div>
  );
}
