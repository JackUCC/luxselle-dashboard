import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, Clock3, ListChecks, Loader2, Play, Plus, Trash2 } from 'lucide-react'
import { ApiError, apiGet, apiPost } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'

interface PriceCheckComp {
  title: string
  price: number
  source: string
  sourceUrl?: string
}

interface PriceCheckResult {
  averageSellingPriceEur: number
  comps: PriceCheckComp[]
  maxBuyEur: number
  maxBidEur: number
}

interface InventoryMatch {
  id: string
  brand: string
  model: string
  status: string
  quantity: number
  sellPriceEur: number
}

type QueueItemStatus = 'pending' | 'running' | 'done' | 'error'

interface QueueItem {
  id: string
  query: string
  status: QueueItemStatus
  result: PriceCheckResult | null
  inventoryMatches: InventoryMatch[]
  errorMessage: string | null
}

interface BatchOutcome {
  query: string
  status: 'done' | 'error'
  result?: PriceCheckResult
  errorMessage?: string
}

interface BatchReport {
  processed: number
  successful: number
  failed: number
  averageMaxBuy: number
  averageMaxBid: number
  bestCandidate: { query: string; maxBidEur: number } | null
}

const MAX_LINES_PER_QUEUE = 50

const STATUS_LABEL: Record<QueueItemStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  done: 'Ready',
  error: 'Error',
}

const STATUS_CLASS: Record<QueueItemStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  running: 'bg-indigo-100 text-indigo-700',
  done: 'bg-emerald-100 text-emerald-700',
  error: 'bg-rose-100 text-rose-700',
}

function parseDraft(raw: string): string[] {
  return raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
}

function createQueueItem(query: string): QueueItem {
  return {
    id: crypto.randomUUID(),
    query,
    status: 'pending',
    result: null,
    inventoryMatches: [],
    errorMessage: null,
  }
}

function buildBatchReport(outcomes: BatchOutcome[]): BatchReport {
  const successfulOutcomes = outcomes.filter(
    (outcome): outcome is BatchOutcome & { result: PriceCheckResult } =>
      outcome.status === 'done' && outcome.result != null
  )

  const successfulCount = successfulOutcomes.length
  const failed = outcomes.length - successfulCount
  const averageMaxBuy =
    successfulCount > 0
      ? successfulOutcomes.reduce((sum, outcome) => sum + outcome.result.maxBuyEur, 0) / successfulCount
      : 0
  const averageMaxBid =
    successfulCount > 0
      ? successfulOutcomes.reduce((sum, outcome) => sum + outcome.result.maxBidEur, 0) / successfulCount
      : 0

  const bestCandidate =
    successfulCount > 0
      ? successfulOutcomes.reduce(
          (best, outcome) =>
            outcome.result.maxBidEur > best.maxBidEur
              ? { query: outcome.query, maxBidEur: outcome.result.maxBidEur }
              : best,
          {
            query: successfulOutcomes[0].query,
            maxBidEur: successfulOutcomes[0].result.maxBidEur,
          }
        )
      : null

  return {
    processed: outcomes.length,
    successful: successfulCount,
    failed,
    averageMaxBuy,
    averageMaxBid,
    bestCandidate,
  }
}

export default function BatchProcessor() {
  const [draft, setDraft] = useState('')
  const [items, setItems] = useState<QueueItem[]>([])
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [lastBatchReport, setLastBatchReport] = useState<BatchReport | null>(null)

  const counts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc[item.status] += 1
        return acc
      },
      { pending: 0, running: 0, done: 0, error: 0 } as Record<QueueItemStatus, number>
    )
  }, [items])

  const runLookup = async (query: string) => {
    const [priceResult, inventoryResult] = await Promise.allSettled([
      apiPost<{ data: PriceCheckResult }>('/pricing/price-check', { query }),
      apiGet<{ data: InventoryMatch[] }>(`/products?q=${encodeURIComponent(query)}&limit=5`),
    ])

    const inventoryMatches =
      inventoryResult.status === 'fulfilled' && Array.isArray(inventoryResult.value.data)
        ? inventoryResult.value.data
            .filter((product: InventoryMatch) => product.status === 'in_stock')
            .slice(0, 5)
        : []

    if (priceResult.status === 'fulfilled') {
      return { result: priceResult.value.data, inventoryMatches, errorMessage: null }
    }

    const message =
      priceResult.reason instanceof ApiError ? priceResult.reason.message : 'Price check failed for this item'
    return { result: null, inventoryMatches, errorMessage: message }
  }

  const processSingleItem = async (id: string, query: string): Promise<BatchOutcome> => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, status: 'running', errorMessage: null } : item
      )
    )

    const lookup = await runLookup(query)

    if (lookup.result) {
      setItems((previous) =>
        previous.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'done',
                result: lookup.result,
                inventoryMatches: lookup.inventoryMatches,
                errorMessage: null,
              }
            : item
        )
      )
      return { query, status: 'done', result: lookup.result }
    }

    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'error',
              result: null,
              inventoryMatches: lookup.inventoryMatches,
              errorMessage: lookup.errorMessage ?? 'Price check failed for this item',
            }
          : item
      )
    )

    return {
      query,
      status: 'error',
      errorMessage: lookup.errorMessage ?? 'Price check failed for this item',
    }
  }

  const handleQueueItems = () => {
    const lines = parseDraft(draft)
    if (lines.length === 0) {
      toast.error('Paste at least one full description')
      return
    }

    const accepted = lines.slice(0, MAX_LINES_PER_QUEUE)
    setItems((previous) => [...previous, ...accepted.map((line) => createQueueItem(line))])
    setDraft('')

    if (lines.length > MAX_LINES_PER_QUEUE) {
      toast.error(`Only the first ${MAX_LINES_PER_QUEUE} lines were queued`)
    } else {
      toast.success(`${accepted.length} item${accepted.length === 1 ? '' : 's'} queued`)
    }
  }

  const handleProcessItem = async (id: string) => {
    if (isProcessingBatch) {
      toast.error('Batch run is already in progress')
      return
    }
    const target = items.find((item) => item.id === id)
    if (!target) return
    const outcome = await processSingleItem(target.id, target.query)
    if (outcome.status === 'done') toast.success('Item report ready')
    else toast.error(outcome.errorMessage ?? 'Item failed')
  }

  const handleProcessBatch = async () => {
    if (isProcessingBatch) return

    const queue = items.filter((item) => item.status === 'pending')
    if (queue.length === 0) {
      toast.error('No pending items to process')
      return
    }

    setIsProcessingBatch(true)
    try {
      const outcomes: BatchOutcome[] = []
      for (const item of queue) {
        outcomes.push(await processSingleItem(item.id, item.query))
      }

      const report = buildBatchReport(outcomes)
      setLastBatchReport(report)

      if (report.successful > 0) {
        toast.success(`Batch complete: ${report.successful}/${report.processed} ready`)
      } else {
        toast.error('Batch finished with errors')
      }
    } finally {
      setIsProcessingBatch(false)
    }
  }

  const handleRemoveItem = (id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id))
  }

  const handleClearCompleted = () => {
    const removable = items.filter((item) => item.status === 'done' || item.status === 'error').length
    if (removable === 0) {
      toast.error('No completed items to clear')
      return
    }
    setItems((previous) => previous.filter((item) => item.status === 'pending' || item.status === 'running'))
    toast.success(`Cleared ${removable} completed item${removable === 1 ? '' : 's'}`)
  }

  return (
    <div className="space-y-2">
      <section className="rounded-xl border border-gray-200 bg-white p-2.5">
        <div className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-gray-500" />
          <h2 className="text-xs font-semibold text-gray-800">Batch workflow</h2>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Paste one full description per line, queue them, then run the full batch.
        </p>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          placeholder={'Chanel Classic Flap Medium Black Caviar\nLouis Vuitton Neverfull MM Damier Ebene'}
          className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleQueueItems}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Queue items
          </button>
          <button
            type="button"
            onClick={handleProcessBatch}
            disabled={isProcessingBatch}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {isProcessingBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run batch
          </button>
        </div>
      </section>

      {lastBatchReport && (
        <section className="rounded-xl border border-gray-200 bg-white p-2.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <p className="text-xs font-semibold text-gray-800">Last batch report</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-gray-500">Processed</p>
              <p className="font-semibold text-gray-800">{lastBatchReport.processed}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-gray-500">Success / Failed</p>
              <p className="font-semibold text-gray-800">{lastBatchReport.successful} / {lastBatchReport.failed}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-gray-500">Avg max buy</p>
              <p className="font-semibold text-gray-800">{formatCurrency(lastBatchReport.averageMaxBuy)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-gray-500">Avg max bid</p>
              <p className="font-semibold text-gray-800">{formatCurrency(lastBatchReport.averageMaxBid)}</p>
            </div>
          </div>
          {lastBatchReport.bestCandidate && (
            <p className="mt-1.5 text-[11px] text-gray-600">
              Best candidate: <span className="font-medium text-gray-800">{lastBatchReport.bestCandidate.query}</span>{' '}
              ({formatCurrency(lastBatchReport.bestCandidate.maxBidEur)} max bid)
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-2.5 py-2">
          <div className="flex items-center gap-2 text-[11px] text-gray-600">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{items.length} queued</span>
            <span>•</span>
            <span>{counts.pending} pending</span>
            <span>•</span>
            <span>{counts.done} ready</span>
          </div>
          <button
            type="button"
            onClick={handleClearCompleted}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Trash2 className="h-3 w-3" />
            Clear completed
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-gray-500">
            Queue is empty. Paste full descriptions above and click <span className="font-medium">Queue items</span>.
          </div>
        ) : (
          <div className="max-h-[56vh] space-y-2 overflow-y-auto p-2.5">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-gray-100 bg-gray-50/40 p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium leading-5 text-gray-800">{item.query}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASS[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleProcessItem(item.id)}
                    disabled={isProcessingBatch || item.status === 'running'}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {item.status === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    Run item
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={item.status === 'running'}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>

                {item.errorMessage && (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-rose-600">
                    <AlertTriangle className="h-3 w-3" />
                    {item.errorMessage}
                  </p>
                )}

                {item.result && (
                  <details className="mt-1.5 rounded-md border border-gray-100 bg-white px-2 py-1.5 text-[11px]">
                    <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                      View report
                    </summary>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      <div className="rounded-md bg-gray-50 p-1.5">
                        <p className="text-gray-500">Avg sell</p>
                        <p className="font-semibold text-gray-800">{formatCurrency(item.result.averageSellingPriceEur)}</p>
                      </div>
                      <div className="rounded-md bg-gray-50 p-1.5">
                        <p className="text-gray-500">Max buy</p>
                        <p className="font-semibold text-gray-800">{formatCurrency(item.result.maxBuyEur)}</p>
                      </div>
                      <div className="rounded-md bg-gray-50 p-1.5">
                        <p className="text-gray-500">Max bid</p>
                        <p className="font-semibold text-gray-800">{formatCurrency(item.result.maxBidEur)}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-gray-500">Comps: {item.result.comps.length} • Inventory: {item.inventoryMatches.length}</p>
                  </details>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
