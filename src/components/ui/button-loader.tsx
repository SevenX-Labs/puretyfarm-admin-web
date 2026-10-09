"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonLoaderProps {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function ButtonLoader({
  loading = false,
  loadingText,
  children,
  icon,
}: ButtonLoaderProps) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 stroke-[3] animate-spin shrink-0" />
        <span>{loadingText || children}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
