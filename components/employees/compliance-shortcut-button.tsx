"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ComplianceShortcutButton() {
  return (
    <Link
      href="#compliance-tab"
      className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
      onClick={() => {
        const tab = document.querySelector('[value="compliance"]') as HTMLElement | null;
        tab?.click();
      }}
    >
      Resolver Pendências
    </Link>
  );
}
