import { SUPPORTED_LLM_MODELS } from "@/lib/pipeline/models";
import { SLIDE_CATALOG } from "@/lib/catalog/slides";
import { DataSourceBadge } from "@/components/shared/DataSourceBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Help & Documentation</h1>
        <p className="text-muted-foreground text-lg">
          Everything you need to configure and run the SEO Automator pipeline.
        </p>
      </div>

      {/* Quick Start Guide */}
      <section>
        <h2 className="text-xl font-bold mb-4">Quick Start Guide</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="shadow-sm bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-primary">1. Connect Google</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Go to the <strong>Authenticate</strong> page. Connect your Google account so the pipeline can fetch GSC and GA4 metrics. This generates the required <code>token.pickle</code>.
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-primary">2. Add a Client</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Go to the <strong>Clients</strong> page. Add a client's website, GSC property URL, and GA4 ID. You can also define custom branding colors here.
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-primary">3. Generate Report</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Go to the <strong>Generate Report</strong> page. Select your client, choose a reporting month, select your slides, and start the pipeline.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Supported Models */}
      <section>
        <h2 className="text-xl font-bold mb-4">Supported AI Models</h2>
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[200px]">Model Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Capabilities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUPPORTED_LLM_MODELS.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{model.provider}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {model.id === "glm-5" ? "Advanced reasoning, complex analysis, and highest accuracy." : 
                       model.id === "glm-4.7" ? "Balanced performance and speed for general use cases." :
                       "Fastest generation, optimized for high volume and speed."}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      {/* Slide Catalog */}
      <section>
        <h2 className="text-xl font-bold mb-4">Slide Catalog</h2>
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead className="min-w-[200px]">Slide Name</TableHead>
                  <TableHead>Data Source</TableHead>
                  <TableHead className="text-center">Requires AI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SLIDE_CATALOG.map((slide) => (
                  <TableRow key={slide.id}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {slide.position}
                    </TableCell>
                    <TableCell className="font-medium">{slide.name}</TableCell>
                    <TableCell>
                      <DataSourceBadge type={slide.dataSource} />
                    </TableCell>
                    <TableCell className="text-center">
                      {slide.requiresAI ? (
                        <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      {/* Troubleshooting FAQ */}
      <section>
        <h2 className="text-xl font-bold mb-4">Troubleshooting & FAQ</h2>
        <Card className="shadow-sm">
          <div className="w-full divide-y">
            <details className="group" open>
              <summary className="cursor-pointer px-4 py-4 font-medium list-none flex justify-between">
                Pipeline fails at "Collecting Google Search Console data"
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <div className="px-4 pb-4 text-muted-foreground text-sm">
                <p>This usually means one of two things:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Your Google account doesn't have read access to the GSC property you provided in the Client Configuration. Double check the exact URL (e.g. <code>sc-domain:example.com</code> or <code>https://www.example.com/</code>).</li>
                  <li>Your OAuth token has expired. Go to the Authenticate page, click "Revoke Access", and authenticate again.</li>
                </ul>
              </div>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer px-4 py-4 font-medium list-none flex justify-between">
                Where can I view the raw generation logs?
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <div className="px-4 pb-4 text-muted-foreground text-sm">
                <p>
                  The Next.js frontend catches the standard output of the Python pipeline. If a generation fails in Step 4, a "Show Technical Details" dropdown will appear containing the traceback. For deeper debugging, you can manually run <code>python generate_report.py &lt;client_key&gt;</code> in the <code>SEO_Report_System</code> directory to see raw execution logs.
                </p>
              </div>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer px-4 py-4 font-medium list-none flex justify-between">
                Missing credentials error on the Authenticate page
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <div className="px-4 pb-4 text-muted-foreground text-sm">
                <p>
                  You must download a Desktop App OAuth 2.0 credential file from Google Cloud Console, rename it to <code>client_secret.json</code>, and place it in the root of the <code>SEO_Report_System</code> directory. The system cannot initiate an OAuth flow without this file.
                </p>
              </div>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer px-4 py-4 font-medium list-none flex justify-between">
                AI Insights are disabled or failing
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <div className="px-4 pb-4 text-muted-foreground text-sm">
                <p>
                  Ensure that you have set the appropriate API key environment variable (<code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code>) in the backend <code>.env</code> file. If the key is missing or invalid, the pipeline will fall back to using placeholder text for all AI-required slides.
                </p>
              </div>
            </details>
          </div>
        </Card>
      </section>
    </div>
  );
}
