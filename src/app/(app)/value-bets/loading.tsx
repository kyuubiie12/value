import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>

      <Skeleton className="h-[52px] w-full rounded-[var(--radius-sm)]" />
      <Skeleton className="h-[280px] w-full rounded-card-lg" />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-20 rounded-[var(--radius-sm)]" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-48 rounded-[var(--radius-sm)]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[158px] rounded-card" />
        ))}
      </div>
    </div>
  );
}
