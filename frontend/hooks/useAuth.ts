"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthStatus } from "@/lib/pipeline/authService";

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      setStatus({ authenticated: false, error: "Failed to fetch auth status" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { status, isLoading, checkAuth };
}
