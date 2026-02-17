import Skeleton from '../../components/feedback/Skeleton'

export default function DashboardSkeleton() {
  return (
    <div className="w-full space-y-8" data-testid="dashboard-skeleton">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="lux-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton variant="circle" className="h-10 w-10" />
            </div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      {/* Profit Summary */}
      <div className="lux-card p-6 space-y-5">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
