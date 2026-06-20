import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "./supabase";
import { useAuth } from "./AuthContext";

// Light-touch analytics : on every route change, insert a row into
// public.page_views with the path + a stable session_id (kept in
// localStorage). No IP, no user-agent, no querystring -> GDPR-friendly
// without a cookie banner. Reads are admin-only via RLS.

const SESSION_KEY = "pillage_session_v1";

function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // localStorage disabled (private mode), use a per-tab fallback that
    // won't survive a reload. Still useful for distinguishing concurrent
    // sessions during the same day.
    return `fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function usePageViewTracking() {
  const location = useLocation();
  const { user } = useAuth();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Strip dynamic UUID segments to keep cardinality low. /galerie/abc-123
    // becomes /galerie/:id so aggregations stay meaningful.
    const normalized = location.pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
      .replace(/\/[A-Za-z0-9_-]{20,}/g, "/:id"); // catch other long opaque ids

    // De-dupe: skip if the same path is fired twice in a row (HMR, double-mount).
    if (lastTracked.current === normalized) return;

    const handle = setTimeout(() => {
      lastTracked.current = normalized;
      void supabase.from("page_views").insert({
        path: normalized,
        session_id: getOrCreateSessionId(),
        user_id: user?.id ?? null,
      });
    }, 300);

    return () => clearTimeout(handle);
  }, [location.pathname, user]);
}
