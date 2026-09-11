import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  actions,
  children,
  className,
  "data-ocid": dataOcid,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  "data-ocid"?: string;
}) {
  return (
    <div className={cn("flex h-full flex-col", className)} data-ocid={dataOcid}>
      <header className="bg-card/80 flex items-center justify-between gap-4 border-b px-4 py-4 md:px-6">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
        {actions}
      </header>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
