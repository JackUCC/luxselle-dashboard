import { useState, useEffect } from 'react'
import { Calculator, Save, RefreshCw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { calculateLandedCost } from '../../lib/landedCost'

interface CalculatorState {
    currency: 'EUR' | 'USD' | 'GBP' | 'JPY'
    basePrice: string
    shipping: string
    insurance: string
    customsRate: string
    importVatRate: string
    platformFeeRate: string
    paymentFeeRate: string
    fixedFee: string
}

interface Preset {
    id: string
    name: string
    validForCurrency: string
    values: Omit<CalculatorState, 'basePrice' | 'currency'>
}

const DEFAULT_STATE: CalculatorState = {
    currency: 'JPY',
    basePrice: '',
    shipping: '0',
    insurance: '0',
    customsRate: '0',
    importVatRate: '23',
    platformFeeRate: '0',
    paymentFeeRate: '0',
    fixedFee: '0',
}

export default function CalculatorWidget() {
    const [state, setState] = useState<CalculatorState>(DEFAULT_STATE)
    const [presets, setPresets] = useState<Preset[]>([])
    const [rates, setRates] = useState<Record<string, number> | null>(null)
    const [loadingRates, setLoadingRates] = useState(false)
    const [presetName, setPresetName] = useState('')
    const [showSavePreset, setShowSavePreset] = useState(false)

    // Load presets on mount
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
            // Fetch base EUR rates
            const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,JPY')
            if (res.ok) {
                const data = await res.json()
                setRates(data.rates)
            }
        } catch (e) {
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
            currency: preset.validForCurrency as any // Start with saved currency preference
        }))
        toast.success(`Loaded "${preset.name}"`)
    }

    const deletePreset = (presetId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const updated = presets.filter(p => p.id !== presetId)
        setPresets(updated)
        localStorage.setItem('luxselle-calc-presets', JSON.stringify(updated))
    }

    // Calculations
    const result = calculateLandedCost({
        basePrice: parseFloat(state.basePrice) || 0,
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

    const rateToEur = state.currency === 'EUR' ? 1 : rates ? (1 / rates[state.currency]) : 0

    const {
        itemCostEur,
        dutyEur,
        vatEur,
        totalLandedEur,
    } = result

    return (
        <div className="lux-card p-6 h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                        <Calculator className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Landed Cost Calculator</h3>
                        <p className="text-[10px] text-gray-500">Estimate total import cost</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {showSavePreset ? (
                        <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200 animate-in fade-in slide-in-from-right-5 duration-200">
                            <input
                                type="text"
                                value={presetName}
                                onChange={e => setPresetName(e.target.value)}
                                placeholder="Preset Name"
                                className="text-xs bg-transparent border-none focus:ring-0 px-2 w-24"
                                autoFocus
                            />
                            <button onClick={handleSavePreset} className="p-1 hover:text-emerald-600"><Save className="h-3 w-3" /></button>
                            <button onClick={() => setShowSavePreset(false)} className="p-1 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSavePreset(true)}
                            className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-2 py-1 transition-colors"
                        >
                            <Save className="h-3 w-3" /> Save Preset
                        </button>
                    )}
                </div>
            </div>

            {presets.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {presets.map(p => (
                        <button
                            key={p.id}
                            onClick={() => loadPreset(p.id)}
                            className="flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs font-medium text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all group"
                        >
                            {p.name}
                            <span onClick={(e) => deletePreset(p.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-500"><Trash2 className="h-3 w-3" /></span>
                        </button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                    <div className="flex rounded-lg shadow-sm">
                        <select
                            value={state.currency}
                            onChange={e => setState(s => ({ ...s, currency: e.target.value as any }))}
                            className="flex-shrink-0 w-20 rounded-l-lg border-gray-300 bg-gray-50 text-gray-500 text-sm focus:ring-gray-900 focus:border-gray-900"
                        >
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                            <option value="JPY">JPY</option>
                        </select>
                        <input
                            type="number"
                            value={state.basePrice}
                            onChange={e => setState(s => ({ ...s, basePrice: e.target.value }))}
                            placeholder="Base Price"
                            className="flex-1 rounded-none rounded-r-lg border-gray-300 text-sm focus:ring-gray-900 focus:border-gray-900 px-3 py-2 border-l-0 border block w-full"
                        />
                    </div>
                    {state.currency !== 'EUR' && (
                        <div className="mt-1 flex justify-end">
                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                {loadingRates ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                                {rates ? `1 ${state.currency} ≈ ${(rateToEur).toFixed(4)} EUR` : 'Loading rates...'}
                            </div>
                        </div>
                    )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Shipping ({state.currency})</label>
                    <input
                        type="number"
                        value={state.shipping}
                        onChange={e => setState(s => ({ ...s, shipping: e.target.value }))}
                        className="lux-input py-2"
                    />
                </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Fees & Taxes</p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Platform Fee %</label>
                        <input type="number" value={state.platformFeeRate} onChange={e => setState(s => ({ ...s, platformFeeRate: e.target.value }))} className="lux-input py-1 text-xs" />
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Customs %</label>
                        <input type="number" value={state.customsRate} onChange={e => setState(s => ({ ...s, customsRate: e.target.value }))} className="lux-input py-1 text-xs" />
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Import VAT %</label>
                        <input type="number" value={state.importVatRate} onChange={e => setState(s => ({ ...s, importVatRate: e.target.value }))} className="lux-input py-1 text-xs" />
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Ins. / Other ({state.currency})</label>
                        <input type="number" value={state.insurance} onChange={e => setState(s => ({ ...s, insurance: e.target.value }))} className="lux-input py-1 text-xs" />
                    </div>
                </div>
            </div>

            <div className="mt-auto bg-gray-900 rounded-xl p-4 text-white">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs text-gray-400">Total Landed Cost</span>
                    <span className="text-xl font-bold font-display">
                        {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(totalLandedEur)}
                    </span>
                </div>
                <div className="space-y-1 pt-2 border-t border-gray-700">
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Item Cost (converted)</span>
                        <span>~€{itemCostEur.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Duty ({state.customsRate}%)</span>
                        <span>+€{dutyEur.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>VAT ({state.importVatRate}%)</span>
                        <span>+€{vatEur.toFixed(0)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
