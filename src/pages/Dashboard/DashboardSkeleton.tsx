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
              <Skeleton className="h-5 w-14" />
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

      {/* Activity & Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 lux-card p-6 space-y-5">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex gap-4">
              <Skeleton variant="circle" className="mt-2 h-2.5 w-2.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="lux-card p-6 space-y-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-40" />
          <div className="space-y-3">
            <Skeleton variant="rect" className="h-14 w-full rounded-lg" />
            <Skeleton variant="rect" className="h-14 w-full rounded-lg" />
          </div>
          <Skeleton variant="rect" className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* VAT Calculator */}
      <div className="lux-card p-6 space-y-5">
        <Skeleton className="h-5 w-44" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton variant="rect" className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Collapsed Market Section */}
      <div className="lux-card p-5">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="h-9 w-9" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </div>
    </div>
  )
}
