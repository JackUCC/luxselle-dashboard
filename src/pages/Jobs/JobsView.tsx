/**
 * System jobs list: filter by type/status, view job detail; uses apiGet (and apiPost where used).
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useScrollLock } from '../../lib/useScrollLock'
import {
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  PlayCircle,
  RefreshCw,
  X,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ChevronDown,
} from 'lucide-react'
import type { SystemJob } from '@shared/schemas'
import { apiGet, apiPost } from '../../lib/api'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader, SectionLabel } from '../../components/design-system'

type SystemJobWithId = SystemJob & { id: string }

interface JobsResponse {
  data: SystemJobWithId[]
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatDuration = (startStr?: string, endStr?: string) => {
  if (!startStr || !endStr) return null
  const start = new Date(startStr).getTime()
  const end = new Date(endStr).getTime()
  const seconds = Math.floor((end - start) / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'succeeded':
    case 'success':
      return {
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle,
        label: 'Succeeded',
      }
    case 'failed':
    case 'fail':
      return {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: XCircle,
        label: 'Failed',
      }
    case 'running':
      return {
        color: 'bg-lux-200 text-lux-800 border-lux-300',
        icon: PlayCircle,
        label: 'Running',
      }
    case 'queued':
      return {
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: Clock,
        label: 'Queued',
      }
    default:
      return {
        color: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: AlertTriangle,
        label: status,
      }
  }
}

const getJobTypeLabel = (type: string) => {
  switch (type) {
    case 'supplier_import':
      return 'Supplier Import'
    case 'pricing_analysis':
      return 'Pricing Analysis'
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

export default function JobsView() {
  const [jobs, setJobs] = useState<SystemJobWithId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedJobId = searchParams.get('job')
  const statusFilter = searchParams.get('status') ?? 'all'

  const setStatusFilter = useCallback((status: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (status === 'all') {
      newParams.delete('status')
    } else {
      newParams.set('status', status)
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const loadJobs = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await apiGet<JobsResponse>('/jobs?limit=100')
      setJobs(response.data)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load jobs'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  const openJobDetail = useCallback((jobId: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('job', jobId)
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const closeJobDetail = useCallback(() => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('job')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const handleRetry = useCallback(async (jobId: string) => {
    setRetryingId(jobId)
    try {
      await apiPost(`/jobs/${jobId}/retry`, {})
      toast.success('Job queued for retry')
      await loadJobs()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retry job'
      toast.error(message)
    } finally {
      setRetryingId(null)
    }
  }, [loadJobs])

  const selectedJob = jobs.find(j => j.id === selectedJobId)

  const normalizedStatus = (s: string) =>
    s === 'success' ? 'succeeded' : s === 'fail' ? 'failed' : s
  const filteredJobs =
    statusFilter === 'all'
      ? jobs
      : jobs.filter((job) => normalizedStatus(job.status) === statusFilter)

  return (
    <PageLayout variant="default">
      <section className="space-y-8">
      <PageHeader
        title="System Jobs"
        purpose="Monitor imports, background tasks, and system operations."
        actions={
          <div className="flex items-center gap-3">
          <div className="relative">
            <label htmlFor="jobs-status-filter" className="sr-only">Filter by status</label>
            <select
              id="jobs-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="lux-input !h-auto !w-auto appearance-none py-2 pl-3 pr-8 text-sm font-medium"
            >
              <option value="all">All Status</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-lux-400 pointer-events-none" />
          </div>
          <button
            onClick={loadJobs}
            disabled={isLoading}
            className="lux-btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        }
      />

      {isLoading && jobs.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-lux-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading jobs...</span>
        </div>
      ) : error ? (
        <div className="lux-card p-8 text-center">
          <p className="text-rose-600 font-medium">{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="lux-card p-12 text-center">
          <FileSpreadsheet className="mx-auto h-8 w-8 text-lux-500 mb-3" />
          <p className="text-lux-600 font-medium">No jobs yet</p>
          <p className="text-sm text-lux-500 mt-1">
            Jobs will appear here when you run imports or background tasks.
          </p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="lux-card p-12 text-center">
          <FileSpreadsheet className="mx-auto h-8 w-8 text-lux-500 mb-3" />
          <p className="text-lux-600 font-medium">No jobs match this status</p>
          <p className="text-sm text-lux-500 mt-1">
            Try a different status filter or refresh the list.
          </p>
        </div>
      ) : (
        <div className="lux-card overflow-hidden animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
          <table className="min-w-full divide-y divide-lux-100">
            <thead className="bg-lux-50/60">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-lux-400">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-lux-400">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-lux-400">
                  Progress
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-lux-400">
                  Started
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-lux-400">
                  Duration
                </th>
                <th className="relative px-6 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lux-100 bg-white">
              {filteredJobs.map((job) => {
                const statusConfig = getStatusConfig(job.status)
                const StatusIcon = statusConfig.icon
                const duration = formatDuration(job.startedAt || job.lastRunAt, job.completedAt)

                return (
                  <tr
                    key={job.id}
                    onClick={() => openJobDetail(job.id)}
                    className="group transition-colors cursor-pointer hover:bg-lux-50/60"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-lux-100 p-2 text-lux-600">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-lux-900">
                            {getJobTypeLabel(job.jobType)}
                          </div>
                          <div className="text-xs text-lux-500 font-mono">
                            #{job.id.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {job.progress ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-lux-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  job.status === 'failed' || job.status === 'fail'
                                    ? 'bg-red-500'
                                    : job.status === 'succeeded' || job.status === 'success'
                                    ? 'bg-green-500'
                                    : 'bg-gray-700'
                                }`}
                                style={{
                                  width: `${job.progress.total > 0 ? (job.progress.processed / job.progress.total) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-lux-600 tabular-nums">
                              {job.progress.processed}/{job.progress.total}
                            </span>
                          </div>
                          {job.progress.errors && job.progress.errors.length > 0 && (
                            <div className="text-xs text-red-600">
                              {job.progress.errors.length} errors
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-lux-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-lux-600">
                      {formatDate(job.startedAt || job.lastRunAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-lux-600">
                      {duration || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(job.status === 'failed' || job.status === 'fail') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRetry(job.id)
                          }}
                          disabled={retryingId === job.id}
                          className="flex items-center gap-1.5 text-xs font-medium text-lux-800 hover:text-lux-900 transition-colors disabled:opacity-50"
                        >
                          {retryingId === job.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Job Detail Drawer */}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          onClose={closeJobDetail}
          onRetry={handleRetry}
        />
      )}
      </section>
    </PageLayout>
  )
}

// === Job Detail Drawer ===

interface JobDetailDrawerProps {
  job: SystemJobWithId
  onClose: () => void
  onRetry: (jobId: string) => void
}

function JobDetailDrawer({ job, onClose, onRetry }: JobDetailDrawerProps) {
  useScrollLock(true)

  const statusConfig = getStatusConfig(job.status)
  const StatusIcon = statusConfig.icon
  const duration = formatDuration(job.startedAt || job.lastRunAt, job.completedAt)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lux-200 bg-lux-50/60">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-lux-100 p-2 text-lux-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-card-header font-semibold text-lux-900">
                {getJobTypeLabel(job.jobType)}
              </h2>
              <p className="text-xs text-lux-500 font-mono">#{job.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-lux-400 hover:text-lux-700 hover:bg-lux-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Section */}
          <div className="animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
            <SectionLabel as="h3" className="mb-3">Status</SectionLabel>
            <div className="lux-card p-4">
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold border ${statusConfig.color}`}>
                  <StatusIcon className="h-4 w-4" />
                  {statusConfig.label}
                </span>
                {(job.status === 'failed' || job.status === 'fail') && (
                  <button
                    onClick={() => onRetry(job.id)}
                    className="lux-btn-secondary text-sm flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry Job
                  </button>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-lux-500">Started</dt>
                  <dd className="font-medium text-lux-900 mt-1">
                    {formatDate(job.startedAt || job.lastRunAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-lux-500">Completed</dt>
                  <dd className="font-medium text-lux-900 mt-1">
                    {formatDate(job.completedAt || job.lastSuccessAt)}
                  </dd>
                </div>
                {duration && (
                  <div>
                    <dt className="text-lux-500">Duration</dt>
                    <dd className="font-medium text-lux-900 mt-1">{duration}</dd>
                  </div>
                )}
                {job.retryCount > 0 && (
                  <div>
                    <dt className="text-lux-500">Retries</dt>
                    <dd className="font-medium text-lux-900 mt-1">
                      {job.retryCount} / {job.maxRetries}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Progress Section */}
          {job.progress && (
            <div className="animate-bento-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
              <SectionLabel as="h3" className="mb-3">Progress</SectionLabel>
              <div className="lux-card p-4 space-y-4">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="lux-card-accent rounded-xl p-3">
                    <div className="text-2xl font-bold text-lux-900">
                      {job.progress.total}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lux-400 mt-1">Total</div>
                  </div>
                  <div className="lux-card-accent rounded-xl p-3">
                    <div className="text-2xl font-bold text-green-600">
                      {job.progress.created}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lux-400 mt-1">Created</div>
                  </div>
                  <div className="lux-card-accent rounded-xl p-3">
                    <div className="text-2xl font-bold text-lux-800">
                      {job.progress.updated}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lux-400 mt-1">Updated</div>
                  </div>
                  <div className="lux-card-accent rounded-xl p-3">
                    <div className="text-2xl font-bold text-red-600">
                      {job.progress.errors?.length || 0}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lux-400 mt-1">Errors</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-lux-500">
                      Processed: {job.progress.processed} / {job.progress.total}
                    </span>
                    <span className="text-xs font-medium text-lux-900">
                      {job.progress.total > 0
                        ? Math.round((job.progress.processed / job.progress.total) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-lux-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        job.status === 'failed' || job.status === 'fail'
                          ? 'bg-red-500'
                          : job.status === 'succeeded' || job.status === 'success'
                          ? 'bg-green-500'
                          : 'bg-gray-700 animate-pulse'
                      }`}
                      style={{
                        width: `${job.progress.total > 0 ? (job.progress.processed / job.progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Errors Section */}
          {job.progress?.errors && job.progress.errors.length > 0 && (
            <div className="animate-bento-enter" style={{ '--stagger': 2 } as React.CSSProperties}>
              <SectionLabel as="h3" className="mb-3">
                Errors ({job.progress.errors.length})
              </SectionLabel>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {job.progress.errors.map((err, idx) => (
                    <div key={idx} className="text-sm">
                      {err.index !== undefined && (
                        <span className="font-mono text-xs text-red-600 mr-2">
                          Row {err.index}:
                        </span>
                      )}
                      <span className="text-red-700">{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {job.lastError && (
            <div className="animate-bento-enter" style={{ '--stagger': 3 } as React.CSSProperties}>
              <SectionLabel as="h3" className="mb-3">Error Details</SectionLabel>
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700">{job.lastError}</p>
              </div>
            </div>
          )}

          {/* Input Metadata */}
          {job.input && Object.keys(job.input).length > 0 && (
            <div className="animate-bento-enter" style={{ '--stagger': 4 } as React.CSSProperties}>
              <SectionLabel as="h3" className="mb-3">Input</SectionLabel>
              <div className="lux-card bg-lux-50 p-4">
                <pre className="text-xs font-mono text-lux-600 whitespace-pre-wrap">
                  {JSON.stringify(job.input, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
