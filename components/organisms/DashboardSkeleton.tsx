import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder que espelha o layout do dashboard enquanto os dados carregam. */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      {/* topbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-14" />
        </div>
      </div>

      {/* faixa de saldo */}
      <Card className="flex flex-col lg:flex-row">
        <div className="flex flex-col gap-3 p-6 lg:w-72 lg:shrink-0">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-48" />
        </div>
        <div className="flex flex-1 gap-6 border-t p-6 lg:border-l lg:border-t-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </Card>

      {/* nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="size-8" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>

      {/* bento */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <div className="flex gap-3 border-b bg-muted/30 p-4">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="flex flex-col gap-4 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </Card>
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
            <div className="flex flex-col gap-3 border-t pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
