import { PanelSkeleton } from './Skeleton';

type RouteFallbackProps = {
  fullScreen?: boolean;
};

export function RouteFallback({ fullScreen = false }: RouteFallbackProps) {
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <p className="font-black text-lg">Kargatzen...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <PanelSkeleton />
    </div>
  );
}
