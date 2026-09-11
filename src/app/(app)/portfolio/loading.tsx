import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-card" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-card" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-5">
        <Skeleton className="h-[360px] rounded-card xl:col-span-3" />
        <Skeleton className="h-[360px] rounded-card xl:col-span-2" />
      </div>

      <Skeleton className="h-[420px] w-full rounded-card" />
    </div>
  );
}
