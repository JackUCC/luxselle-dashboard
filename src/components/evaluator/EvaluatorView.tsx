import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)

interface AnalysisResult {
  estimatedRetailEur: number
  maxBuyPriceEur: number
  historyAvgPaidEur: number | null
  comps: Array<{
    title: string
    price: number
    source: string
    url?: string
  }>
  confidence: number
  provider: string
  evaluationId: string
}

export default function EvaluatorView() {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    category: '',
    condition: '',
    colour: '',
    notes: '',
    askPriceEur: '',
  })
  const [searchParams] = useSearchParams()
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAddingToBuyList, setIsAddingToBuyList] = useState(false)

  useEffect(() => {
    const brand = searchParams.get('brand')
    const model = searchParams.get('model')
    const category = searchParams.get('category')
    const condition = searchParams.get('condition')
    const colour = searchParams.get('colour')

    if (brand || model || category || condition || colour) {
      setFormData((prev) => ({
        ...prev,
        ...(brand !== null ? { brand } : {}),
        ...(model !== null ? { model } : {}),
        ...(category !== null ? { category } : {}),
        ...(condition !== null ? { condition } : {}),
        ...(colour !== null ? { colour } : {}),
      }))
    }
  }, [searchParams])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleAnalyse = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAnalysing(true)
    setError(null)

    try {
      const response = await fetch('/api/pricing/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          askPriceEur: formData.askPriceEur ? Number(formData.askPriceEur) : undefined,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Analysis failed')
      }

      const data = await response.json()
      setResult(data.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      setError(message)
    } finally {
      setIsAnalysing(false)
    }
  }

  const handleAddToBuyList = async () => {
    if (!result) return

    setIsAddingToBuyList(true)
    try {
      const response = await fetch('/api/buying-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'evaluator',
          evaluationId: result.evaluationId,
          brand: formData.brand,
          model: formData.model,
          category: formData.category,
          condition: formData.condition,
          colour: formData.colour,
          targetBuyPriceEur: result.maxBuyPriceEur,
          status: 'pending',
          notes: formData.notes,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to add to buying list')
      }

      alert('Added to buying list!')
      // Reset form
      setFormData({
        brand: '',
        model: '',
        category: '',
        condition: '',
        colour: '',
        notes: '',
        askPriceEur: '',
      })
      setResult(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add to buying list'
      alert(message)
    } finally {
      setIsAddingToBuyList(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Evaluator</h1>
        <p className="text-sm text-gray-500">
          Analyse item pricing and add to buying list
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Item Details</h2>
          <form onSubmit={handleAnalyse} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand *
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  placeholder="e.g., handbag, tote, clutch"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition *
                </label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                >
                  <option value="">Select condition</option>
                  <option value="new">New</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colour
                </label>
                <input
                  type="text"
                  name="colour"
                  value={formData.colour}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Ask Price (EUR)
                </label>
                <input
                  type="number"
                  name="askPriceEur"
                  value={formData.askPriceEur}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isAnalysing}
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isAnalysing ? 'Analysing...' : 'Analyse'}
            </button>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Results */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Analysis Results</h2>
          {!result ? (
            <div className="text-center text-sm text-gray-500 py-12">
              Fill in the form and click "Analyse" to see results
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Estimated Retail Price
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(result.estimatedRetailEur)}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Max Buy Price (35% margin)
                  </div>
                  <div className="text-2xl font-semibold text-green-600">
                    {formatCurrency(result.maxBuyPriceEur)}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Historical Avg Paid
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {result.historyAvgPaidEur
                      ? formatCurrency(result.historyAvgPaidEur)
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Confidence: {(result.confidence * 100).toFixed(0)}% · Provider:{' '}
                  {result.provider}
                </div>
              </div>

              {result.comps.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    Comparables
                  </div>
                  <div className="space-y-2">
                    {result.comps.map((comp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {comp.title}
                          </div>
                          <div className="text-xs text-gray-500">{comp.source}</div>
                        </div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(comp.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToBuyList}
                disabled={isAddingToBuyList}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isAddingToBuyList ? 'Adding...' : 'Add to Buying List'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
