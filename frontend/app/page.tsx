import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileBarChart, Key, FilePlus2, Settings, ChevronRight } from 'lucide-react';

export default async function Home() {


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Section */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-border/50 rounded-2xl p-8 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">
            Welcome to SEO Automator
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">
            Generate stunning, AI-powered SEO reports in seconds. Automate Google Search Console and GA4 data extraction straight into branded PowerPoint presentations.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
      </section>

      {/* Quick Start Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FilePlus2 className="h-5 w-5 text-primary" />
          Quick Actions
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/authenticate" className="group">
            <Card className="h-full hover:border-primary/50 transition-colors shadow-sm cursor-pointer">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Key className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-base">1. Authenticate</CardTitle>
                <CardDescription className="text-xs">Connect Google account</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          
          <Link href="/clients" className="group">
            <Card className="h-full hover:border-primary/50 transition-colors shadow-sm cursor-pointer">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-base">2. Manage Clients</CardTitle>
                <CardDescription className="text-xs">Add sites & branding</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          
          <Link href="/generate" className="group lg:col-span-2">
            <Card className="h-full border-primary/30 bg-primary/5 hover:border-primary transition-colors shadow-sm cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <FileBarChart className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">3. Generate Report</CardTitle>
                    <CardDescription className="text-xs">Configure, select slides & build PPTX</CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all mt-2" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>


    </div>
  );
}
