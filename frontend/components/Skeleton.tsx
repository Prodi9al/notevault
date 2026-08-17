export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

export function DocumentCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <Skeleton className="h-5 w-12" />
      <Skeleton className="mt-4 h-4 w-5/6" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function DocumentRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-border px-2 py-4">
      <Skeleton className="h-9 w-12 rounded-md" />
      <div className="flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-2 h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="hidden h-3 w-20 sm:block" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-6 h-6 w-16" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <Skeleton className="mt-3 h-4 w-32" />
      <Skeleton className="mt-8 h-24 w-full rounded-lg" />
      <Skeleton className="mt-6 h-32 w-full rounded-lg" />
    </div>
  );
}
