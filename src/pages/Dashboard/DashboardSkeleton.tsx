import Skeleton from '../../components/feedback/Skeleton'

export default function DashboardSkeleton() {
  return (
    <div className="w-full space-y-8" data-testid="dashboard-skeleton">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="lux-card p-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="lux-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton variant="circle" className="h-8 w-8" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
