import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      data-ocid="empty_state"
      className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground size-7" />
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
