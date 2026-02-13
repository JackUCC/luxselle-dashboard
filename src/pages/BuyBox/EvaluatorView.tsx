/**
 * Buy-box / evaluator: analyse item (brand/model/category), get pricing suggestion, optional image upload; uses pricing API.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Tag, Calculator, Sparkles, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { apiPost, apiGet, apiPostFormData, ApiError } from '../../lib/api'
import type {
  AuctionPlatformProfile,
  LandedCostSnapshot,
  Product,
  Settings,
} from '@shared/schemas'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)

// Brand and model database for luxury items
const BRAND_MODELS: Record<string, string[]> = {
  'Chanel': ['Classic Flap', '2.55', 'Boy', 'Gabrielle', '19', 'Coco Handle', 'Vanity Case'],
  'Hermès': ['Birkin', 'Kelly', 'Constance', 'Evelyne', 'Picotin', 'Lindy', 'Garden Party'],
  'Louis Vuitton': ['Speedy', 'Neverfull', 'Pochette Metis', 'Alma', 'Capucines', 'OnTheGo', 'Twist'],
  'Gucci': ['Marmont', 'Dionysus', 'Jackie', 'Horsebit 1955', 'Ophidia', 'Bamboo', 'Soho Disco'],
  'Prada': ['Galleria', 'Cahier', 'Cleo', 'Re-Edition 2005', 'Hobo', 'Sidonie'],
  'Dior': ['Lady Dior', 'Saddle', 'Book Tote', '30 Montaigne', 'Diorama', 'Miss Dior'],
  'Bottega Veneta': ['Pouch', 'Cassette', 'Jodie', 'Arco', 'Cabat', 'Intrecciato'],
  'Fendi': ['Baguette', 'Peekaboo', 'By The Way', 'Kan I', 'Mon Tresor'],
  'Givenchy': ['Antigona', 'Pandora', 'GV3', 'Cut Out'],
  'Loewe': ['Puzzle', 'Hammock', 'Barcelona', 'Gate', 'Flamenco'],
}

const COMMON_COLORS = [
  'Black', 'White', 'Beige', 'Navy', 'Brown', 'Burgundy', 'Red',
  'Pink', 'Grey', 'Tan', 'Camel', 'Gold', 'Silver'
]

const YEARS = Array.from({ length: 25 }, (_, i) => (new Date().getFullYear() - i).toString())

interface AnalysisResult {
  estimatedRetailEur: number
  maxBuyPriceEur: number
  historyAvgPaidEur: number | null
  comps: Array<{
    title: string
    price: number
    source: string
    sourceUrl?: string
    marketCountry?: string
    marketScope?: 'IE' | 'EU_FALLBACK'
  }>
  confidence: number
  provider: string
  evaluationId: string
  marketSummary?: {
    marketCountry: 'IE'
    marketMode: 'ie_first_eu_fallback'
    ieCount: number
    euFallbackCount: number
    fallbackUsed: boolean
  }
}

interface AuctionLandedCostResponse {
  data: LandedCostSnapshot
}

import CalculatorWidget from '../../components/CalculatorWidget'

type ProductWithId = Product & { id: string }

export default function EvaluatorView() {
  const [activeTab, setActiveTab] = useState<'details' | 'calculator'>('details')
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    category: '',
    condition: '',
    colour: '',
    year: '',
    notes: '',
    askPriceEur: '',
  })
  const [searchParams] = useSearchParams()
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAddingToBuyList, setIsAddingToBuyList] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [landedCostInput, setLandedCostInput] = useState({
    platformId: '',
    hammerEur: '',
    buyerPremiumPct: '',
    platformFeePct: '',
    fixedFeeEur: '',
    paymentFeePct: '',
    shippingEur: '',
    insuranceEur: '',
    customsDutyPct: '',
    importVatPct: '',
  })
  const [landedCostResult, setLandedCostResult] = useState<LandedCostSnapshot | null>(null)
  const [isCalculatingLandedCost, setIsCalculatingLandedCost] = useState(false)
  const [saveLandedCostSnapshot, setSaveLandedCostSnapshot] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [products, setProducts] = useState<ProductWithId[]>([])

  // Fetch products for learning model/brand combinations
  useEffect(() => {
    apiGet<{ data: ProductWithId[] }>('/products')
      .then((response) => {
        setProducts(response.data)
      })
      .catch(() => {
        // Silently fail - we have fallback brand/model data
      })

    apiGet<{ data: Settings }>('/settings')
      .then((response) => {
        setSettings(response.data)
      })
      .catch(() => {
        // Silently fail - calculator can still run with manual entries
      })
  }, [])

  const selectedAuctionPlatform = useMemo(() => {
    if (!settings?.auctionPlatforms?.length) return null
    return (
      settings.auctionPlatforms.find((platform) => platform.id === landedCostInput.platformId) ??
      settings.auctionPlatforms.find((platform) => platform.enabled) ??
      settings.auctionPlatforms[0]
    )
  }, [settings, landedCostInput.platformId])

  useEffect(() => {
    if (!settings) return
    const defaultPlatform =
      settings.auctionPlatforms.find((platform) => platform.enabled) ??
      settings.auctionPlatforms[0]

    setLandedCostInput((prev) => ({
      ...prev,
      platformId: prev.platformId || defaultPlatform?.id || '',
      buyerPremiumPct: prev.buyerPremiumPct || String(defaultPlatform?.buyerPremiumPct ?? 0),
      platformFeePct: prev.platformFeePct || String(defaultPlatform?.platformFeePct ?? 0),
      fixedFeeEur: prev.fixedFeeEur || String(defaultPlatform?.fixedFeeEur ?? 0),
      paymentFeePct: prev.paymentFeePct || String(defaultPlatform?.paymentFeePct ?? 0),
      shippingEur: prev.shippingEur || String(defaultPlatform?.defaultShippingEur ?? 0),
      insuranceEur: prev.insuranceEur || String(defaultPlatform?.defaultInsuranceEur ?? 0),
      customsDutyPct:
        prev.customsDutyPct || String(defaultPlatform?.defaultCustomsDutyPct ?? 0),
      importVatPct:
        prev.importVatPct ||
        String(defaultPlatform?.defaultImportVatPct ?? settings.importVatPctDefault ?? 23),
    }))
  }, [settings])

  // Get available models for selected brand (from products + predefined list)
  const availableModels = useMemo(() => {
    const { brand } = formData
    if (!brand) return []

    // Combine predefined models with models from actual products
    const predefinedModels = BRAND_MODELS[brand] || []
    const productModels = products
      .filter(p => p.brand === brand)
      .map(p => p.model)

    return Array.from(new Set([...predefinedModels, ...productModels])).sort()
  }, [formData.brand, products])

  // Reset model when brand changes
  useEffect(() => {
    if (formData.brand && formData.model) {
      // Check if current model is valid for selected brand
      if (!availableModels.includes(formData.model)) {
        setFormData(prev => ({ ...prev, model: '' }))
      }
    }
  }, [formData.brand, formData.model, availableModels])

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    setUploadedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAnalyzeImage = async () => {
    if (!uploadedImage) return

    setIsAnalyzingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', uploadedImage)

      const { data } = await apiPostFormData<{ data: { brand?: string; model?: string; category?: string; condition?: string; colour?: string } }>(
        '/pricing/analyze-image',
        formData,
      )

      setFormData(prev => ({
        ...prev,
        brand: data?.brand ?? prev.brand,
        model: data?.model ?? prev.model,
        category: data?.category ?? prev.category,
        condition: data?.condition ?? prev.condition,
        colour: data?.colour ?? prev.colour,
      }))

      toast.success('Image analyzed! Check the pre-filled details.')
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to analyze image'
      toast.error(message)
    } finally {
      setIsAnalyzingImage(false)
    }
  }

  const handleAnalyse = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAnalysing(true)
    setError(null)

    try {
      const { data } = await apiPost<{ data: AnalysisResult }>('/pricing/analyse', {
        ...formData,
        askPriceEur: formData.askPriceEur ? Number(formData.askPriceEur) : undefined,
        marketCountry: 'IE',
        marketMode: 'ie_first_eu_fallback',
        landedCostSnapshot: saveLandedCostSnapshot ? landedCostResult ?? undefined : undefined,
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
        landedCostSnapshot: saveLandedCostSnapshot ? landedCostResult ?? undefined : undefined,
      })
      toast.success('Added to buying list!')
      setFormData({
        brand: '',
        model: '',
        category: '',
        condition: '',
        colour: '',
        year: '',
        notes: '',
        askPriceEur: '',
      })
      setResult(null)
      handleRemoveImage()
      setLandedCostResult(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add to buying list'
      toast.error(message)
    } finally {
      setIsAddingToBuyList(false)
    }
  }

  const handlePlatformChange = (platform: AuctionPlatformProfile | null) => {
    if (!platform) {
      setLandedCostInput((prev) => ({ ...prev, platformId: '' }))
      return
    }
    setLandedCostInput((prev) => ({
      ...prev,
      platformId: platform.id,
      buyerPremiumPct: String(platform.buyerPremiumPct),
      platformFeePct: String(platform.platformFeePct),
      fixedFeeEur: String(platform.fixedFeeEur),
      paymentFeePct: String(platform.paymentFeePct),
      shippingEur: String(platform.defaultShippingEur),
      insuranceEur: String(platform.defaultInsuranceEur),
      customsDutyPct: String(platform.defaultCustomsDutyPct),
      importVatPct: String(platform.defaultImportVatPct),
    }))
  }

  const handleLandedCostInputChange = (field: keyof typeof landedCostInput, value: string) => {
    setLandedCostInput((prev) => ({ ...prev, [field]: value }))
  }

  const handleCalculateLandedCost = async () => {
    const hammerValue = Number(landedCostInput.hammerEur)
    if (!hammerValue || hammerValue <= 0) {
      toast.error('Enter a hammer price to calculate landed cost')
      return
    }

    setIsCalculatingLandedCost(true)
    try {
      const payload = {
        platformId: landedCostInput.platformId || undefined,
        hammerEur: hammerValue,
        buyerPremiumPct: Number(landedCostInput.buyerPremiumPct || 0),
        platformFeePct: Number(landedCostInput.platformFeePct || 0),
        fixedFeeEur: Number(landedCostInput.fixedFeeEur || 0),
        paymentFeePct: Number(landedCostInput.paymentFeePct || 0),
        shippingEur: Number(landedCostInput.shippingEur || 0),
        insuranceEur: Number(landedCostInput.insuranceEur || 0),
        customsDutyPct: Number(landedCostInput.customsDutyPct || 0),
        importVatPct: Number(landedCostInput.importVatPct || settings?.importVatPctDefault || 23),
      }

      const response = await apiPost<AuctionLandedCostResponse>(
        '/pricing/auction-landed-cost',
        payload,
      )
      setLandedCostResult(response.data)
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to calculate landed cost'
      toast.error(message)
    } finally {
      setIsCalculatingLandedCost(false)
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
          {/* Tab Switcher */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'details'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Tag className="mb-1 mr-2 inline-block h-4 w-4" />
              Item Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'calculator'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Calculator className="mb-1 mr-2 inline-block h-4 w-4" />
              Landed Cost
            </button>
          </div>

          {activeTab === 'calculator' ? (
            <CalculatorWidget />
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  <Tag className="h-4 w-4" />
                  Product Details
                </div>
                {uploadedImage && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Clear Image
                  </button>
                )}
              </div>

              {/* Image Upload Section */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                  Product Image (Optional)
                </label>

                {imagePreview ? (
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-gray-200 mb-3">
                    <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-gray-600 hover:text-red-600 shadow-sm transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload product image</p>
                    <p className="text-xs text-gray-400 mt-1">AI will analyze the image</p>
                  </label>
                )}

                {uploadedImage && (
                  <button
                    type="button"
                    onClick={handleAnalyzeImage}
                    disabled={isAnalyzingImage}
                    className="w-full mt-3 rounded-lg border border-blue-200 bg-blue-50 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {isAnalyzingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing image...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4" />
                        Analyze with AI
                      </>
                    )}
                  </button>
                )}
              </div>

              <form onSubmit={handleAnalyse} className="space-y-5">
                <div>
                  <label htmlFor="brand-select" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Brand *
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
                    {Object.keys(BRAND_MODELS).sort().map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="model-select" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Model *
                  </label>
                  {availableModels.length > 0 ? (
                    <select
                      id="model-select"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      required
                      className="lux-input"
                      disabled={!formData.brand}
                    >
                      <option value="">Select Model</option>
                      {availableModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                      <option value="__custom__">Other (type manually)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Classic Flap"
                      className="lux-input"
                      disabled={!formData.brand}
                    />
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formData.brand ? `${availableModels.length} models available for ${formData.brand}` : 'Select a brand first'}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="condition-select" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                      Condition *
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
                      <option value="new">New / Pristine</option>
                      <option value="excellent">Excellent (A)</option>
                      <option value="good">Good (B)</option>
                      <option value="fair">Fair (C)</option>
                      <option value="used">Used</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="colour-select" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                      Color *
                    </label>
                    <select
                      id="colour-select"
                      name="colour"
                      value={formData.colour}
                      onChange={handleChange}
                      required
                      className="lux-input"
                    >
                      <option value="">Select Color</option>
                      {COMMON_COLORS.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                      <option value="__custom__">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="year-select" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                      Year
                    </label>
                    <select
                      id="year-select"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className="lux-input"
                    >
                      <option value="">Unknown</option>
                      {YEARS.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="category-input" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Category *
                  </label>
                  <select
                    id="category-input"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="lux-input"
                  >
                    <option value="">Select Category</option>
                    <option value="Handbag">Handbag</option>
                    <option value="Wallet">Wallet</option>
                    <option value="Shoes">Shoes</option>
                    <option value="Watch">Watch</option>
                    <option value="Jewelry">Jewelry</option>
                    <option value="Accessory">Accessory</option>
                    <option value="Clothing">Clothing</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="notes-input" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes-input"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Size, material, special features..."
                    rows={2}
                    className="lux-input resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="ask-price-input" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Asking Price (EUR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    <input
                      id="ask-price-input"
                      type="number"
                      name="askPriceEur"
                      value={formData.askPriceEur}
                      onChange={handleChange}
                      placeholder="0"
                      step="0.01"
                      className="lux-input pl-7"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Optional - helps calibrate analysis</p>
                </div>

                {/* Legacy Landed Cost Calculator removed in favor of standalone widget */}

                <button
                  type="submit"
                  disabled={isAnalysing}
                  className="w-full rounded-lg bg-gray-500 py-3 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAnalysing ? 'Analyzing Market...' : 'Analyze Market'}
                </button>

                {
                  error && (
                    <div className="text-xs text-red-600 text-center mt-2">
                      {error}
                    </div>
                  )
                }
              </form>
            </>
          )}
        </div >

        {/* Results / Empty State */}
        < div className={`lux-card relative min-h-[400px] ${!result ? 'border-dashed border-2' : ''}`
        }>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full font-medium">
                    Ireland market
                  </span>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                    {(result.confidence * 100).toFixed(0)}% Confidence
                  </span>
                  {result.marketSummary?.fallbackUsed && (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full font-medium">
                      EU fallback used
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-6 text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Estimated Retail Price
                </div>
                <div className="text-4xl font-display font-bold text-gray-900">
                  {formatCurrency(result.estimatedRetailEur)}
                </div>
                {result.marketSummary && (
                  <div className="text-xs text-gray-500 mt-2">
                    {result.marketSummary.ieCount} IE comps
                    {result.marketSummary.euFallbackCount > 0
                      ? ` + ${result.marketSummary.euFallbackCount} EU fallback`
                      : ''}
                  </div>
                )}
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
                        <div className="pr-4 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {comp.sourceUrl ? (
                              <a
                                href={comp.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-blue-700 underline-offset-2 hover:underline"
                              >
                                {comp.title}
                              </a>
                            ) : (
                              comp.title
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {comp.source}
                            {comp.marketCountry ? ` · ${comp.marketCountry}` : ''}
                            {comp.marketScope === 'EU_FALLBACK' ? ' · fallback' : ''}
                          </div>
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
        </div >
      </div >
    </section >
  )
}
