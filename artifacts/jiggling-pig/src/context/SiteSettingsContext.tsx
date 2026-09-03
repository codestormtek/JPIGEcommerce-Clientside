"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiGet } from "@/lib/api";

type SiteSettings = Record<string, string>;

interface SiteSettingsResponse {
  success: boolean;
  data: SiteSettings;
}

interface SiteSettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: {},
  loading: true,
});

export function SiteSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<SiteSettingsResponse>("/site-settings/public")
      .then((res) => {
        setSettings(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
