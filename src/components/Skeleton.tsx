type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-neutral-200 border-2 border-neutral-300 ${className}`} />;
}

export function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-12">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
