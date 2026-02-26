import { useState, useEffect, useRef } from 'react'
import { Calculator, Save, Trash2, ChevronDown, ChevronUp, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiGet } from '../../lib/api'
import { calculateLandedCost, calculateMaxBuyPrice } from '../../lib/landedCost'
import type { CostBreakdownItem } from '../../lib/landedCost'
import { ArrowUpDown, Box, ShoppingBag, Watch } from 'lucide-react'

type Currency = 'EUR' | 'USD' | 'GBP' | 'JPY'

interface CalculatorState {
    calculatorMode: 'forward' | 'reverse'
    currency: Currency
    basePrice: string
    shipping: string
    insurance: string
    customsRate: string
    importVatRate: string
    platformFeeRate: string
    paymentFeeRate: string
    fixedFee: string
    sellPrice: string
    targetSellPrice: string
    targetMargin: string
}

interface Preset {
    id: string
    name: string
    validForCurrency: string
    values: Omit<CalculatorState, 'basePrice' | 'currency' | 'sellPrice' | 'targetSellPrice' | 'calculatorMode'>
}

const DEFAULT_STATE: CalculatorState = {
    calculatorMode: 'forward',
    currency: 'JPY',
    basePrice: '',
    shipping: '0',
    insurance: '0',
    customsRate: '0',
    importVatRate: '23',
    platformFeeRate: '0',
    paymentFeeRate: '0',
    fixedFee: '0',
    sellPrice: '',
    targetSellPrice: '',
    targetMargin: '30',
}

const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
}

const CATEGORY_PRESETS = [
    { label: 'Handbags', icon: ShoppingBag, customs: '3', vat: '23' },
    { label: 'Watches', icon: Watch, customs: '4.5', vat: '23' },
    { label: 'Accessories', icon: Box, customs: '12', vat: '23' },
]

const FEE_TOOLTIPS: Record<string, string> = {
    platformFeeRate: 'Fee charged by the auction/selling platform (e.g. Yahoo Auctions, eBay)',
    paymentFeeRate: 'Payment processing fee (e.g. credit card, PayPal)',
    customsRate: 'Customs duty rate for importing goods into Ireland/EU. Leather handbags (HS 4202) are typically 3%. Verify at TARIC: ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp',
    importVatRate: 'Import VAT applied on (CIF value + customs duty)',
    insurance: 'Shipping insurance or other flat-rate costs',
    fixedFee: 'Fixed transaction fees (e.g. handling, proxy service)',
}

function Tooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false)
    return (
        <span className="relative inline-flex ml-1">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onFocus={() => setShow(true)}
                onBlur={() => setShow(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
            >
                <Info className="h-3 w-3" />
            </button>
            {show && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg bg-gray-900 px-3 py-2 text-[10px] text-white shadow-lg z-50 animate-fade-in pointer-events-none">
                    {text}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </span>
            )}
        </span>
    )
}

function CostWaterfallBar({ breakdown }: { breakdown: CostBreakdownItem[] }) {
    if (breakdown.length === 0) return null
    return (
        <div className="space-y-2">
            <div className="flex rounded-full overflow-hidden h-3 bg-gray-100 shadow-inner">
                {breakdown.map((item, i) => (
                    <div
                        key={item.label}
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                            width: `${Math.max(item.pct, 0.5)}%`,
                            backgroundColor: item.color,
                            borderRadius: i === 0 ? '9999px 0 0 9999px' : i === breakdown.length - 1 ? '0 9999px 9999px 0' : '0',
                        }}
                        title={`${item.label}: €${item.amountEur.toFixed(2)} (${item.pct.toFixed(1)}%)`}
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {breakdown.map(item => (
                    <div key={item.label} className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function PercentSlider({ value, onChange, max = 50 }: { value: string; onChange: (v: string) => void; max?: number }) {
    return (
        <input
            type="range"
            min="0"
            max={max}
            step="0.5"
            value={parseFloat(value) || 0}
            onChange={e => onChange(e.target.value)}
            className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-700 mt-1"
        />
    )
}

export default function CalculatorWidget() {
    const [state, setState] = useState<CalculatorState>(DEFAULT_STATE)
    const [presets, setPresets] = useState<Preset[]>([])
    const [rates, setRates] = useState<Record<string, number> | null>(null)
    const [loadingRates, setLoadingRates] = useState(false)
    const [presetName, setPresetName] = useState('')
    const [showSavePreset, setShowSavePreset] = useState(false)
    const [feesExpanded, setFeesExpanded] = useState(true)
    const [showMargin, setShowMargin] = useState(false)
    const resultRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const saved = localStorage.getItem('luxselle-calc-presets')
        if (saved) {
            try {
                setPresets(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to load presets', e)
            }
        }
        fetchRates()
    }, [])

    const fetchRates = async () => {
        setLoadingRates(true)
        try {
            const data = await apiGet<{ rates?: Record<string, number> }>('/fx')
            if (data?.rates && typeof data.rates === 'object') {
                setRates(data.rates)
                setLoadingRates(false)
                return
            }
        } catch {
            // Backend /fx failed; try external fallback
        }
        try {
            const fallback = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,JPY')
            if (fallback.ok) {
                const data = (await fallback.json()) as { rates?: Record<string, number> }
                setRates(data.rates ?? null)
            }
        } catch {
            toast.error('Failed to load exchange rates')
        } finally {
            setLoadingRates(false)
        }
    }

    const handleSavePreset = () => {
        if (!presetName.trim()) {
            toast.error('Enter a preset name')
            return
        }
        const newPreset: Preset = {
            id: Date.now().toString(),
            name: presetName,
            validForCurrency: state.currency,
            values: {
                shipping: state.shipping,
                insurance: state.insurance,
                customsRate: state.customsRate,
                importVatRate: state.importVatRate,
                platformFeeRate: state.platformFeeRate,
                paymentFeeRate: state.paymentFeeRate,
                fixedFee: state.fixedFee,
                targetMargin: state.targetMargin,
            }
        }
        const updatedPresets = [...presets, newPreset]
        setPresets(updatedPresets)
        localStorage.setItem('luxselle-calc-presets', JSON.stringify(updatedPresets))
        setPresetName('')
        setShowSavePreset(false)
        toast.success('Preset saved')
    }

    const loadPreset = (presetId: string) => {
        const preset = presets.find(p => p.id === presetId)
        if (!preset) return
        setState(prev => ({
            ...prev,
            ...preset.values,
            currency: preset.validForCurrency as Currency
        }))
        toast.success(`Loaded "${preset.name}"`)
    }

    const deletePreset = (presetId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const updated = presets.filter(p => p.id !== presetId)
        setPresets(updated)
        localStorage.setItem('luxselle-calc-presets', JSON.stringify(updated))
    }

    // Real-time calculation
    const maxBuyPrice = state.calculatorMode === 'reverse'
        ? calculateMaxBuyPrice({
            targetSellPriceEur: parseFloat(state.targetSellPrice) || 0,
            desiredMarginPct: parseFloat(state.targetMargin) || 0,
            currency: state.currency,
            rates,
            shipping: parseFloat(state.shipping) || 0,
            insurance: parseFloat(state.insurance) || 0,
            customsPct: parseFloat(state.customsRate) || 0,
            importVatPct: parseFloat(state.importVatRate) || 0,
            platformFeePct: parseFloat(state.platformFeeRate) || 0,
            paymentFeePct: parseFloat(state.paymentFeeRate) || 0,
            fixedFee: parseFloat(state.fixedFee) || 0,
        })
        : 0

    // If reverse mode, use calculated maxBuyPrice as basePrice for breakdown
    const effectiveBasePrice = state.calculatorMode === 'reverse'
        ? maxBuyPrice
        : (parseFloat(state.basePrice) || 0)

    const result = calculateLandedCost({
        basePrice: effectiveBasePrice,
        currency: state.currency,
        rates,
        shipping: parseFloat(state.shipping) || 0,
        insurance: parseFloat(state.insurance) || 0,
        customsPct: parseFloat(state.customsRate) || 0,
        importVatPct: parseFloat(state.importVatRate) || 0,
        platformFeePct: parseFloat(state.platformFeeRate) || 0,
        paymentFeePct: parseFloat(state.paymentFeeRate) || 0,
        fixedFee: parseFloat(state.fixedFee) || 0,
        sellPriceEur: state.calculatorMode === 'reverse'
            ? (parseFloat(state.targetSellPrice) || undefined)
            : (showMargin && state.sellPrice ? parseFloat(state.sellPrice) : undefined),
    })

    const rateToEur = state.currency === 'EUR' ? 1 : rates ? (1 / rates[state.currency]) : 0
    const hasInput = state.calculatorMode === 'reverse'
        ? (parseFloat(state.targetSellPrice) || 0) > 0
        : (parseFloat(state.basePrice) || 0) > 0
    const sym = CURRENCY_SYMBOLS[state.currency] || state.currency

    const fmtEur = (v: number) =>
        new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(v)

    const marginColor = result.marginPct != null
        ? result.marginPct >= 30 ? 'text-emerald-500' : result.marginPct >= 15 ? 'text-amber-500' : 'text-red-500'
        : ''

    const MarginIcon = result.marginPct != null
        ? result.marginPct >= 0 ? TrendingUp : TrendingDown
        : Minus

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 p-2 text-emerald-600 shadow-sm">
                        <Calculator className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Landed Cost Calculator</h3>
                        <p className="text-[10px] text-gray-400">Real-time import cost estimator</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {showSavePreset ? (
                        <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200 animate-fade-in">
                            <input
                                type="text"
                                value={presetName}
                                onChange={e => setPresetName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                                placeholder="Preset Name"
                                className="text-xs bg-transparent border-none focus:ring-0 px-2 w-24"
                                autoFocus
                            />
                            <button onClick={handleSavePreset} className="p-1 hover:text-emerald-600 transition-colors"><Save className="h-3 w-3" /></button>
                            <button onClick={() => setShowSavePreset(false)} className="p-1 hover:text-red-600 transition-colors"><Trash2 className="h-3 w-3" /></button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSavePreset(true)}
                            className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-2 py-1 transition-all hover:shadow-sm"
                        >
                            <Save className="h-3 w-3" /> Save
                        </button>
                    )}
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                    onClick={() => setState(s => ({ ...s, calculatorMode: 'forward' }))}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${state.calculatorMode === 'forward'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <Calculator className="h-3.5 w-3.5" />
                    Landed Cost
                </button>
                <button
                    onClick={() => setState(s => ({ ...s, calculatorMode: 'reverse' }))}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${state.calculatorMode === 'reverse'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                        }`}
                >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Target Buy Price
                </button>
            </div>

            {/* Presets */}
            {presets.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {presets.map(p => (
                        <button
                            key={p.id}
                            onClick={() => loadPreset(p.id)}
                            className="flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs font-medium text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all group"
                        >
                            {p.name}
                            <span className="text-[10px] text-gray-400">{p.validForCurrency}</span>
                            <span onClick={(e) => deletePreset(p.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"><Trash2 className="h-3 w-3" /></span>
                        </button>
                    ))}
                </div>
            )}

            {/* Quick Categories */}
            <div className="flex gap-2 justify-center pb-2 border-b border-gray-50">
                {CATEGORY_PRESETS.map(cat => (
                    <button
                        key={cat.label}
                        onClick={() => setState(s => ({ ...s, customsRate: cat.customs, importVatRate: cat.vat }))}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                        title={`Customs: ${cat.customs}%, VAT: ${cat.vat}%`}
                    >
                        <div className="p-1.5 rounded-full bg-gray-50 text-gray-400 group-hover:bg-white group-hover:text-amber-500 group-hover:shadow-sm transition-all">
                            <cat.icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Inputs */}
            {state.calculatorMode === 'forward' ? (
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Item Price</label>
                    <div className="flex rounded-lg shadow-sm">
                        <select
                            value={state.currency}
                            onChange={e => setState(s => ({ ...s, currency: e.target.value as Currency }))}
                            className="flex-shrink-0 w-20 rounded-l-lg border-gray-200 bg-gray-50 text-gray-600 text-sm font-medium focus:ring-gray-900 focus:border-gray-900"
                        >
                            <option value="EUR">€ EUR</option>
                            <option value="USD">$ USD</option>
                            <option value="GBP">£ GBP</option>
                            <option value="JPY">¥ JPY</option>
                        </select>
                        <input
                            type="number"
                            value={state.basePrice}
                            onChange={e => setState(s => ({ ...s, basePrice: e.target.value }))}
                            placeholder="Enter item price"
                            className="flex-1 rounded-none rounded-r-lg border-gray-200 text-sm focus:ring-gray-900 focus:border-gray-900 px-3 py-2.5 border-l-0 border block w-full"
                            autoFocus
                        />
                    </div>
                    {state.currency !== 'EUR' && (
                        <div className="mt-1.5 flex justify-between items-center">
                            <span className="text-[10px] text-gray-400">
                                {loadingRates ? 'Loading rates...' : rates ? `1 ${state.currency} ≈ ${rateToEur.toFixed(4)} EUR` : '—'}
                            </span>
                            {hasInput && rates && (
                                <span className="text-[10px] font-medium text-gray-500">
                                    ≈ {fmtEur(result.itemCostEur)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Target Sell Price (€)</label>
                        <input
                            type="number"
                            value={state.targetSellPrice}
                            onChange={e => setState(s => ({ ...s, targetSellPrice: e.target.value }))}
                            placeholder="e.g. 1000"
                            className="lux-input py-2.5"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Target Margin %</label>
                        <div className="flex rounded-lg shadow-sm">
                            <input
                                type="number"
                                value={state.targetMargin}
                                onChange={e => setState(s => ({ ...s, targetMargin: e.target.value }))}
                                placeholder="30"
                                className="flex-1 rounded-l-lg border-gray-200 py-2.5 border-r-0 lux-input rounded-r-none"
                            />
                            <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">
                                %
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Shipping */}
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Shipping <span className="text-gray-400 font-normal">({sym})</span>
                </label>
                <input
                    type="number"
                    value={state.shipping}
                    onChange={e => setState(s => ({ ...s, shipping: e.target.value }))}
                    className="lux-input py-2"
                    placeholder="0"
                />
            </div>

            {/* Currency Selector (Only in Reverse Mode) needs access to change currency */}
            {state.calculatorMode === 'reverse' && (
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Target Currency</label>
                    <select
                        value={state.currency}
                        onChange={e => setState(s => ({ ...s, currency: e.target.value as Currency }))}
                        className="lux-input"
                    >
                        <option value="EUR">€ EUR</option>
                        <option value="USD">$ USD</option>
                        <option value="GBP">£ GBP</option>
                        <option value="JPY">¥ JPY</option>
                    </select>
                </div>
            )}

            {/* Fees & Taxes — Collapsible */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                    type="button"
                    onClick={() => setFeesExpanded(!feesExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
                >
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fees & Taxes</span>
                    <div className="flex items-center gap-2">
                        {!feesExpanded && hasInput && (
                            <span className="text-[10px] text-gray-400">
                                {fmtEur(result.dutyEur + result.vatEur + result.totalForeignFeesEur)}
                            </span>
                        )}
                        {feesExpanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                            : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                        }
                    </div>
                </button>

                {feesExpanded && (
                    <div className="p-4 space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Platform Fee */}
                            <div>
                                <label className="flex items-center text-[10px] text-gray-500 mb-1">
                                    Platform Fee %
                                    <Tooltip text={FEE_TOOLTIPS.platformFeeRate} />
                                </label>
                                <input
                                    type="number"
                                    value={state.platformFeeRate}
                                    onChange={e => setState(s => ({ ...s, platformFeeRate: e.target.value }))}
                                    className="lux-input py-1.5 text-xs"
                                    step="0.5"
                                />
                                <PercentSlider value={state.platformFeeRate} onChange={v => setState(s => ({ ...s, platformFeeRate: v }))} max={30} />
                            </div>

                            {/* Customs */}
                            <div>
                                <label className="flex items-center text-[10px] text-gray-500 mb-1">
                                    Customs Duty %
                                    <Tooltip text={FEE_TOOLTIPS.customsRate} />
                                </label>
                                <input
                                    type="number"
                                    value={state.customsRate}
                                    onChange={e => setState(s => ({ ...s, customsRate: e.target.value }))}
                                    className="lux-input py-1.5 text-xs"
                                    step="0.5"
                                />
                                <PercentSlider value={state.customsRate} onChange={v => setState(s => ({ ...s, customsRate: v }))} max={25} />
                            </div>

                            {/* Import VAT */}
                            <div>
                                <label className="flex items-center text-[10px] text-gray-500 mb-1">
                                    Import VAT %
                                    <Tooltip text={FEE_TOOLTIPS.importVatRate} />
                                </label>
                                <input
                                    type="number"
                                    value={state.importVatRate}
                                    onChange={e => setState(s => ({ ...s, importVatRate: e.target.value }))}
                                    className="lux-input py-1.5 text-xs"
                                    step="0.5"
                                />
                                <PercentSlider value={state.importVatRate} onChange={v => setState(s => ({ ...s, importVatRate: v }))} max={30} />
                            </div>

                            {/* Payment Fee */}
                            <div>
                                <label className="flex items-center text-[10px] text-gray-500 mb-1">
                                    Payment Fee %
                                    <Tooltip text={FEE_TOOLTIPS.paymentFeeRate} />
                                </label>
                                <input
                                    type="number"
                                    value={state.paymentFeeRate}
                                    onChange={e => setState(s => ({ ...s, paymentFeeRate: e.target.value }))}
                                    className="lux-input py-1.5 text-xs"
                                    step="0.5"
                                />
                                <PercentSlider value={state.paymentFeeRate} onChange={v => setState(s => ({ ...s, paymentFeeRate: v }))} max={10} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                            {/* Insurance */}
                            <div>
                                <label className="flex items-center text-[10px] text-gray-500 mb-1">
                                    Insurance / Other ({sym})
                                    <Tooltip text={FEE_TOOLTIPS.insurance} />
                                </label>
                                <input
                                    type="number"
                                    value={state.insurance}
                                    onChange={e => setState(s => ({ ...s, insurance: e.target.value }))}
                                    className="lux-input py-1.5 text-xs"
                                    placeholder="0"
                                />
                            </div>

                            {/* Fixed Fee */}
                            <div>
                                <label className="flex items-center text-[10px] text-gray-500 mb-1">
                                    Fixed Fee ({sym})
                                    <Tooltip text={FEE_TOOLTIPS.fixedFee} />
                                </label>
                                <input
                                    type="number"
                                    value={state.fixedFee}
                                    onChange={e => setState(s => ({ ...s, fixedFee: e.target.value }))}
                                    className="lux-input py-1.5 text-xs"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ RESULTS ═══ */}
            <div ref={resultRef} className={`rounded-xl overflow-hidden transition-all duration-300 ${hasInput ? 'opacity-100' : 'opacity-40'}`}>
                {/* Waterfall bar */}
                {hasInput && result.breakdown.length > 0 && (
                    <div className="px-1 pb-3 animate-fade-in">
                        <CostWaterfallBar breakdown={result.breakdown} />
                    </div>
                )}

                {/* Total card */}
                <div className="bg-gray-900 rounded-xl p-5 text-white">
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                {state.calculatorMode === 'reverse' ? 'Max Buy Price' : 'Total Landed Cost'}
                            </span>
                            {hasInput && state.currency !== 'EUR' && state.calculatorMode === 'forward' && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                    ≈ {sym}{(result.totalLandedEur / rateToEur).toLocaleString('en', { maximumFractionDigits: state.currency === 'JPY' ? 0 : 2 })}
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <span className={`text-2xl font-bold font-display tracking-tight ${state.calculatorMode === 'reverse' ? 'text-emerald-400' : 'text-white'}`}>
                                {state.calculatorMode === 'reverse'
                                    ? <>{sym}{effectiveBasePrice.toLocaleString('en', { maximumFractionDigits: state.currency === 'JPY' ? 0 : 2 })}</>
                                    : fmtEur(result.totalLandedEur)
                                }
                            </span>
                            {state.calculatorMode === 'reverse' && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                    ≈ {fmtEur(effectiveBasePrice * rateToEur)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Line-by-line breakdown */}
                    {hasInput && (
                        <div className="space-y-1.5 pt-3 border-t border-gray-700/50">
                            {result.breakdown.map((item, i) => (
                                <div
                                    key={item.label}
                                    className="flex justify-between text-[11px] animate-fade-in"
                                    style={{ animationDelay: `${i * 40}ms` }}
                                >
                                    <span className="text-gray-400 flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                                        {item.label}
                                    </span>
                                    <span className="text-gray-300 font-medium tabular-nums">
                                        {fmtEur(item.amountEur)}
                                        <span className="text-gray-500 ml-1.5 text-[10px]">{item.pct.toFixed(1)}%</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ MARGIN CALCULATOR (Only in Forward Mode) ═══ */}
            {state.calculatorMode === 'forward' && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowMargin(!showMargin)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
                    >
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Profit Margin
                        </span>
                        {showMargin
                            ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                            : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                        }
                    </button>

                    {showMargin && (
                        <div className="p-4 space-y-3 animate-fade-in">
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Sell Price (EUR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                                    <input
                                        type="number"
                                        value={state.sellPrice}
                                        onChange={e => setState(s => ({ ...s, sellPrice: e.target.value }))}
                                        placeholder="Enter planned sell price"
                                        className="lux-input py-2 pl-7 text-sm"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            {result.marginEur != null && result.marginPct != null && (
                                <div className={`rounded-lg p-4 flex items-center justify-between animate-fade-in ${result.marginPct >= 30 ? 'bg-emerald-50 border border-emerald-100'
                                    : result.marginPct >= 15 ? 'bg-amber-50 border border-amber-100'
                                        : 'bg-red-50 border border-red-100'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <MarginIcon className={`h-5 w-5 ${marginColor}`} />
                                        <div>
                                            <div className={`text-lg font-bold font-display ${marginColor}`}>
                                                {result.marginPct.toFixed(1)}%
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                                Gross Margin
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-bold font-display ${marginColor}`}>
                                            {result.marginEur >= 0 ? '+' : ''}{fmtEur(result.marginEur)}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            Profit per unit
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!state.sellPrice && hasInput && (
                                <p className="text-[10px] text-gray-400 text-center">
                                    Enter a sell price to see your margin
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
