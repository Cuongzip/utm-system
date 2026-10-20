"use client";

import React from "react";
import { cn } from "@/lib";

export interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px] leading-[32px]">
        {title}
      </h1>

      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
