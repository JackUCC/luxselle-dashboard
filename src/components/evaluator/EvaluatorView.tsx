import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Tag, Calculator, Sparkles } from 'lucide-react'
import { apiPost } from '../../lib/api'

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
      const { data } = await apiPost<{ data: AnalysisResult }>('/pricing/analyse', {
        ...formData,
        askPriceEur: formData.askPriceEur ? Number(formData.askPriceEur) : undefined,
      })
      setResult(data)
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
      await apiPost('/buying-list', {
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
      })
      toast.success('Added to buying list!')
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
      toast.error(message)
    } finally {
      setIsAddingToBuyList(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-gray-900">Item Evaluator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Instant pricing intelligence for potential buys.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input Form */}
        <div className="lux-card p-6 h-fit">
          <div className="flex items-center gap-2 mb-6 text-sm font-semibold text-gray-900 uppercase tracking-wide">
            <Tag className="h-4 w-4" />
            Product Details
          </div>
          
          <form onSubmit={handleAnalyse} className="space-y-5">
            <div>
              <label htmlFor="brand-select" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                Brand
              </label>
              <select
                id="brand-select"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
                className="lux-input"
              >
                <option value="">Select Brand</option>
                <option value="Chanel">Chanel</option>
                <option value="Hermès">Hermès</option>
                <option value="Louis Vuitton">Louis Vuitton</option>
                <option value="Gucci">Gucci</option>
                <option value="Prada">Prada</option>
                <option value="Dior">Dior</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                Model
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                placeholder="e.g. Classic Flap"
                className="lux-input"
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="condition-select" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                  Condition
                </label>
                <select
                  id="condition-select"
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  required
                  className="lux-input"
                >
                  <option value="">Grade</option>
                  <option value="new">New</option>
                  <option value="excellent">Grade A</option>
                  <option value="good">Grade B</option>
                  <option value="fair">Grade C</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="colour-input" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                  Color
                </label>
                <input
                  id="colour-input"
                  type="text"
                  name="colour"
                  value={formData.colour}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Black"
                  className="lux-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                placeholder="e.g. Handbag"
                className="lux-input"
              />
            </div>

            <button
              type="submit"
              disabled={isAnalysing}
              className="w-full rounded-lg bg-gray-500 py-3 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isAnalysing ? 'Analyzing Market...' : 'Analyze Market'}
            </button>
            
            {error && (
              <div className="text-xs text-red-600 text-center mt-2">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Results / Empty State */}
        <div className={`lux-card relative min-h-[400px] ${!result ? 'border-dashed border-2' : ''}`}>
          {!result ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <Calculator className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Ready to evaluate</p>
              <p className="text-sm opacity-60">Enter product details to begin</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Analysis Results</h2>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                  {(result.confidence * 100).toFixed(0)}% Confidence
                </span>
              </div>

              <div className="rounded-xl bg-gray-50 p-6 text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Estimated Retail Price
                </div>
                <div className="text-4xl font-display font-bold text-gray-900">
                  {formatCurrency(result.estimatedRetailEur)}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-100 p-4 bg-white shadow-sm">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Max Buy Price
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(result.maxBuyPriceEur)}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Target 35% Margin</div>
                </div>

                <div className="rounded-xl border border-gray-100 p-4 bg-white shadow-sm">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Avg Paid History
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {result.historyAvgPaidEur
                      ? formatCurrency(result.historyAvgPaidEur)
                      : '—'}
                  </div>
                </div>
              </div>

              {result.comps.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                    Recent Comparables
                  </div>
                  <div className="space-y-3">
                    {result.comps.map((comp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
                      >
                        <div className="font-medium text-gray-900 truncate pr-4">
                          {comp.title}
                        </div>
                        <div className="font-mono text-gray-600 whitespace-nowrap">
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
                className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors mt-4"
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
