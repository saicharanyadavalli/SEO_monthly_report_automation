"use client";

import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Key, ShieldAlert, ShieldCheck, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AuthenticatePage() {
  const searchParams = useSearchParams();
  const { status, isLoading, checkAuth } = useAuth();
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    // Check URL for callback results
    const err = searchParams?.get('error');
    const success = searchParams?.get('success');
    
    if (success === 'true') {
      toast.success('Successfully authenticated with Google!');
      // Clean up URL without reload
      window.history.replaceState(null, '', '/authenticate');
      checkAuth();
    } else if (err) {
      toast.error(`Authentication failed: ${err}`);
      window.history.replaceState(null, '', '/authenticate');
    }
  }, [searchParams, checkAuth]);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await fetch('/api/auth/revoke', { method: 'POST' });
      toast.success('Access revoked successfully.');
      await checkAuth();
    } catch (error) {
      toast.error('Failed to revoke access.');
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse">Loading auth status...</div>;
  }

  return (
    <div className="flex flex-col space-y-6 max-w-4xl mx-auto py-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Key className="h-6 w-6 text-primary" />
          Google Authentication
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect your Google account to grant read-only access to Search Console and GA4 data.
        </p>
      </div>

      {status?.missingCredentials && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Missing OAuth Credentials</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>The system cannot find <code className="bg-black/10 px-1 py-0.5 rounded">client_secret.json</code> in the pipeline root directory.</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2 text-sm">
              <li>Go to the Google Cloud Console.</li>
              <li>Create an OAuth 2.0 Client ID (Desktop app or Web application).</li>
              <li>Download the JSON file.</li>
              <li>Rename it to <code>client_secret.json</code> and place it in the `SEO_Report_System` folder.</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {status?.authenticated ? (
        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-emerald-700 dark:text-emerald-400">Authenticated</CardTitle>
                <CardDescription>
                  Your Google account is connected and tokens are securely stored.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <strong>Scopes Granted:</strong>
              <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                {status.scopes?.map(s => (
                  <li key={s} className="break-all">{s}</li>
                )) || <li>Unknown scopes</li>}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 border-t border-emerald-500/10 pt-4">
            <Link 
              href="/api/auth/login" 
              className={cn("gap-2 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground")}
            >
              <RefreshCw className="h-4 w-4" /> Regenerate Token
            </Link>
            <Button 
              variant="destructive" 
              className="gap-2" 
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              <LogOut className="h-4 w-4" /> {isRevoking ? "Revoking..." : "Revoke Access"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Connect Google Account</CardTitle>
            <CardDescription>
              You need to authenticate to generate reports using real data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              By authenticating, you grant the system read-only access to your Search Console and Analytics data. 
              Tokens are stored securely on the local server in <code>token.pickle</code> format to be utilized by the Python backend pipeline.
            </p>
          </CardContent>
          <CardFooter>
            {status?.missingCredentials ? (
              <Button disabled className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Authenticate with Google
              </Button>
            ) : (
              <Link 
                href="/api/auth/login"
                className="gap-2 inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
              >
                <ShieldCheck className="h-4 w-4" /> Authenticate with Google
              </Link>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
