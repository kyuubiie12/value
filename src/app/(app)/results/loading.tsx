import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <Skeleton className="h-[188px] w-full rounded-card-lg" />

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-5">
        <Skeleton className="h-[360px] rounded-card xl:col-span-3" />
        <Skeleton className="h-[360px] rounded-card xl:col-span-2" />
      </div>

      <Skeleton className="h-9 w-full rounded-card" />
      <Skeleton className="h-[420px] w-full rounded-card" />
    </div>
  );
}
