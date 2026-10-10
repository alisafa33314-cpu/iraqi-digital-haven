// Lightweight skeleton placeholders shown while data loads
export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-neon rounded-2xl overflow-hidden">
          <div className="aspect-square skeleton" />
          <div className="p-3 space-y-2">
            <div className="h-4 rounded skeleton" />
            <div className="h-3 w-2/3 rounded skeleton" />
            <div className="h-8 rounded-lg skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6, className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-neon rounded-2xl p-5 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl skeleton" />
          <div className="h-4 w-16 rounded skeleton" />
          <div className="h-3 w-12 rounded skeleton" />
        </div>
      ))}
    </div>
  );
}
