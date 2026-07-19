export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

export function SkeletonWarehouseCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="h-1.5 bg-gray-200 animate-pulse" />
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-3/4" />
            <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-1/2" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-5 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTaskRow() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-2/3" />
        <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-1/3" />
      </div>
      <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
    </div>
  );
}

export function SkeletonDashboardCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3.5 md:p-5">
      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-200 animate-pulse mb-3 md:mb-4" />
      <div className="h-8 w-14 bg-gray-200 rounded-lg animate-pulse mb-1.5" />
      <div className="h-3 w-20 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  );
}
