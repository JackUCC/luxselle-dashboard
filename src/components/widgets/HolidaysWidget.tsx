import { useEffect, useState } from 'react'
import { Calendar, Globe } from 'lucide-react'

interface Holiday {
    date: string
    localName: string
    name: string
    countryCode: string
    fixed: boolean
    global: boolean
    counties: string[] | null
    launchYear: number | null
    types: string[]
}

const COUNTRIES = [
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'GB', name: 'UK', flag: '🇬🇧' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
]

export default function HolidaysWidget() {
    const [holidays, setHolidays] = useState<(Holiday & { countryFlag: string })[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchHolidays = async () => {
            setLoading(true)
            try {
                const nextHolidays: (Holiday & { countryFlag: string })[] = []

                await Promise.all(
                    COUNTRIES.map(async (country) => {
                        try {
                            const res = await fetch(`https://date.nager.at/api/v3/NextPublicHolidays/${country.code}`)
                            if (res.ok) {
                                const data: Holiday[] = await res.json()
                                data.slice(0, 2).forEach(h => {
                                    nextHolidays.push({ ...h, countryFlag: country.flag })
                                })
                            }
                        } catch (e) {
                            console.error(`Failed to fetch holidays for ${country.code}`, e)
                        }
                    })
                )

                nextHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                setHolidays(nextHolidays.slice(0, 5))
            } catch {
                setError('Could not load holiday data')
            } finally {
                setLoading(false)
            }
        }

        fetchHolidays()
    }, [])

    const getDaysUntil = (dateStr: string) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const target = new Date(dateStr)
        const diffTime = target.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Tomorrow'
        return `in ${diffDays} days`
    }

    return (
        <div className="lux-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-violet-50 p-2 text-violet-600 border border-violet-100">
                        <Calendar className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Logistics Holidays</h3>
                </div>
                <Globe className="h-4 w-4 text-gray-400" />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {error ? (
                    <div className="text-center text-sm text-rose-600 py-2 bg-rose-50 rounded-xl border border-rose-200">{error}</div>
                ) : loading ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-gray-100 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                                    <div className="h-2 bg-gray-50 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : holidays.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 py-4">No upcoming holidays found.</div>
                ) : (
                    <div className="space-y-3">
                        {holidays.map((holiday, idx) => (
                            <div key={`${holiday.countryCode}-${holiday.date}-${idx}`} className="flex items-start gap-3 group p-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col items-center justify-center h-10 w-10 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-500 shrink-0">
                                    <span className="text-[10px] uppercase text-gray-400 leading-none mb-0.5">{new Date(holiday.date).toLocaleString('en-US', { month: 'short' })}</span>
                                    <span className="text-base leading-none text-gray-900">{new Date(holiday.date).getDate()}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-900 truncate pr-2">{holiday.name}</p>
                                        <span className="text-lg leading-none" title={holiday.countryCode}>{holiday.countryFlag}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${getDaysUntil(holiday.date) === 'Today' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                            getDaysUntil(holiday.date) === 'Tomorrow' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                'bg-indigo-50 text-indigo-600 border-indigo-200'
                                            }`}>
                                            {getDaysUntil(holiday.date)}
                                        </span>
                                        <span className="text-xs text-gray-400 truncate">{holiday.localName}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 text-[10px] text-gray-400 text-center">
                Nager.Date API
            </div>
        </div>
    )
}
