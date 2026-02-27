import Skeleton from '../../components/feedback/Skeleton'

export default function DashboardSkeleton() {
  return (
    <div className="w-full space-y-4" data-testid="dashboard-skeleton">
      {/* Row 1 */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lux-card p-6 sm:col-span-2 space-y-4">
          <Skeleton className="h-3 w-32" variant="text" />
          <Skeleton className="h-12 w-full" variant="rect" />
          <div className="flex gap-3">
            <Skeleton className="h-7 w-32 rounded-full" variant="rect" />
            <Skeleton className="h-7 w-32 rounded-full" variant="rect" />
          </div>
        </div>
        <div className="lux-card p-6 space-y-4">
          <Skeleton className="h-3 w-36" variant="text" />
          <Skeleton className="h-12 w-full" variant="rect" />
          <Skeleton className="h-6 w-24" variant="rect" />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="lux-card p-6 space-y-4">
            <Skeleton className="h-3 w-28" variant="text" />
            <Skeleton className="h-8 w-36" variant="rect" />
            <Skeleton className="h-4 w-20" variant="rect" />
          </div>
        ))}
      </div>

      {/* Row 3 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="lux-card p-6 space-y-3">
            <Skeleton className="h-3 w-24" variant="text" />
            <Skeleton className="h-10 w-full" variant="rect" />
            <Skeleton className="h-10 w-full" variant="rect" />
          </div>
        ))}
      </div>
    </div>
  )
}
