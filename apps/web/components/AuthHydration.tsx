"use client";

import { useEffect } from "react";
import { authApi } from "@/lib/api";

/**
 * On mount, tries to restore access token from refresh cookie (silent refresh).
 * This runs once so that after a full page reload the in-memory access token is set.
 */
export function AuthHydration() {
  useEffect(() => {
    authApi.refresh();
  }, []);
  return null;
}
