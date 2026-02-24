import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getTenantBranding } from "@arkdata/firebase-sdk";

const CACHE_KEY = "arkdata_branding";

const DEFAULT_BRANDING = {
  app_name: "Ark Data",
  logo_url: "/logo.png",
  primary_color: "#0f172a",
  accent_color: "#7c3aed",
  favicon_url: "",
};

const BrandingContext = createContext(DEFAULT_BRANDING);

export function useBranding() {
  return useContext(BrandingContext);
}

export function BrandingProvider({ children }) {
  const { user } = useAuth();
  const [branding, setBranding] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? { ...DEFAULT_BRANDING, ...JSON.parse(cached) } : DEFAULT_BRANDING;
    } catch {
      return DEFAULT_BRANDING;
    }
  });

  useEffect(() => {
    if (!user?.tenant_id) return;

    let cancelled = false;

    getTenantBranding(user.tenant_id).then((result) => {
      if (cancelled) return;
      const merged = { ...DEFAULT_BRANDING, ...result };
      setBranding(merged);
      localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    }).catch(() => {
      // Use cached/defaults on error
    });

    return () => { cancelled = true; };
  }, [user?.tenant_id]);

  // Apply CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", branding.primary_color);
    root.style.setProperty("--brand-accent", branding.accent_color);
  }, [branding.primary_color, branding.accent_color]);

  // Update favicon
  useEffect(() => {
    if (!branding.favicon_url) return;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = branding.favicon_url;
  }, [branding.favicon_url]);

  // Update document title
  useEffect(() => {
    if (branding.app_name && branding.app_name !== "Ark Data") {
      document.title = branding.app_name;
    }
  }, [branding.app_name]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
