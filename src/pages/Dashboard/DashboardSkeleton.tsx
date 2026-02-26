import Skeleton from '../../components/feedback/Skeleton'

export default function DashboardSkeleton() {
  return (
    <div className="w-full space-y-8" data-testid="dashboard-skeleton">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="lux-card p-5 space-y-3">
            <Skeleton className="h-3 w-20" variant="text" />
            <Skeleton className="h-6 w-28" variant="rect" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-1 sm:max-w-md">
        <div className="lux-card p-5 space-y-3">
          <Skeleton className="h-4 w-24" variant="text" />
          <Skeleton className="h-9 w-full" variant="rect" />
        </div>
      </div>
      <div className="lux-card p-5">
        <Skeleton className="h-4 w-32" variant="text" />
      </div>
    </div>
  )
}
