"use client";

import { useState } from "react";
import { Menu, X, Database, FileText } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button 
        onClick={() => setOpen(true)}
        className="p-2 -ml-2 mr-2 text-foreground hover:bg-muted rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex w-64 max-w-sm flex-col bg-background shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary z-50"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="h-full overflow-y-auto" onClick={() => setOpen(false)}>
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
