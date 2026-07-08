"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Home, FileBarChart, Users, HelpCircle, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Generate Report", href: "/generate", icon: FileBarChart },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Authenticate", href: "/authenticate", icon: HelpCircle },
];

export function Sidebar() {
  const { status, isLoading } = useAuth();
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setClientCount(data.clientCount || 0))
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-full w-64 flex-col bg-background/80 backdrop-blur-xl border-r border-border/50">
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileBarChart className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">SEO Automator</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col px-4 py-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4">
        <div className="bg-muted/50 rounded-lg p-3 border border-border/50 text-center">
          <div className="text-2xl font-bold text-foreground">{clientCount}</div>
          <div className="text-xs text-muted-foreground">Clients Configured</div>
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-border/50 space-y-2">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground">
          {isLoading ? (
            <div className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
            </div>
          ) : status?.authenticated ? (
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
          ) : (
            <div className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </div>
          )}
          {isLoading ? "Checking Auth..." : status?.authenticated ? "Authenticated" : "Not Authenticated"}
        </div>
        <Link
          href="/settings"
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Settings className="h-5 w-5 shrink-0" />
          Settings
        </Link>
      </div>
    </div>
  );
}
