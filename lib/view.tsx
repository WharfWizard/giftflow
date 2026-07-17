"use client";

import { createContext, useContext, useState } from "react";

export type ViewMode = "household" | string; // "household" or a personId

interface ViewContextValue {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}

const ViewContext = createContext<ViewContextValue | null>(null);

export function ViewProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("household");
  return <ViewContext.Provider value={{ viewMode, setViewMode }}>{children}</ViewContext.Provider>;
}

export function useView(): ViewContextValue {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error("useView must be used inside ViewProvider");
  return ctx;
}
