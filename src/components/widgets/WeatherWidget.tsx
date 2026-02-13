import { useEffect, useState } from 'react'
import { Cloud, Droplets, Wind, RefreshCw, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog } from 'lucide-react'

interface WeatherData {
    temperature: number
    weatherCode: number
    windSpeed: number
    humidity: number
    isDay: boolean
}

interface LocationWeather {
    name: string
    flag: string
    lat: number
    lon: number
    data: WeatherData | null
}

const LOCATIONS: Omit<LocationWeather, 'data'>[] = [
    { name: 'Cork', flag: '🇮🇪', lat: 51.8985, lon: -8.4756 },
    { name: 'Shanghai', flag: '🇨🇳', lat: 31.2304, lon: 121.4737 },
    { name: 'London', flag: '🇬🇧', lat: 51.5074, lon: -0.1278 },
]

// Map WMO weather codes to icons + descriptions
const getWeatherInfo = (code: number, isDay: boolean) => {
    if (code === 0) return { icon: Sun, label: 'Clear', gradient: isDay ? 'from-amber-500/20 to-orange-500/10' : 'from-indigo-500/20 to-blue-500/10' }
    if (code <= 3) return { icon: Cloud, label: 'Cloudy', gradient: 'from-slate-400/20 to-gray-500/10' }
    if (code <= 48) return { icon: CloudFog, label: 'Foggy', gradient: 'from-gray-400/20 to-slate-500/10' }
    if (code <= 67) return { icon: CloudRain, label: 'Rain', gradient: 'from-blue-500/20 to-cyan-500/10' }
    if (code <= 77) return { icon: CloudSnow, label: 'Snow', gradient: 'from-blue-200/20 to-white/10' }
    if (code <= 82) return { icon: CloudRain, label: 'Showers', gradient: 'from-blue-600/20 to-indigo-500/10' }
    if (code <= 99) return { icon: CloudLightning, label: 'Storm', gradient: 'from-violet-500/20 to-purple-600/10' }
    return { icon: Cloud, label: 'Unknown', gradient: 'from-gray-500/20 to-gray-600/10' }
}

export default function WeatherWidget() {
    const [locations, setLocations] = useState<LocationWeather[]>(LOCATIONS.map(l => ({ ...l, data: null })))
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchWeather = async () => {
        setLoading(true)
        setError(null)
        try {
            const results = await Promise.all(
                LOCATIONS.map(async (loc) => {
                    const res = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day`
                    )
                    if (!res.ok) throw new Error(`Failed for ${loc.name}`)
                    const json = await res.json()
                    return {
                        ...loc,
                        data: {
                            temperature: json.current.temperature_2m,
                            weatherCode: json.current.weather_code,
                            windSpeed: json.current.wind_speed_10m,
                            humidity: json.current.relative_humidity_2m,
                            isDay: json.current.is_day === 1,
                        } as WeatherData,
                    }
                })
            )
            setLocations(results)
        } catch (err) {
            setError('Weather data unavailable')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchWeather()
        const interval = setInterval(fetchWeather, 30 * 60 * 1000) // 30 min refresh
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="lux-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
                        <Cloud className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-200 uppercase tracking-wider text-xs">Weather</h3>
                </div>
                <button
                    onClick={fetchWeather}
                    disabled={loading}
                    className="text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-50"
                    title="Refresh weather"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-3">
                {error ? (
                    <div className="text-center text-sm text-rose-400 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">{error}</div>
                ) : loading && !locations[0]?.data ? (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-white/[0.04] rounded-xl w-full" />
                        ))}
                    </div>
                ) : (
                    locations.map((loc) => {
                        if (!loc.data) return null
                        const weather = getWeatherInfo(loc.data.weatherCode, loc.data.isDay)
                        const WeatherIcon = weather.icon
                        return (
                            <div key={loc.name} className={`flex items-center justify-between p-3 rounded-xl bg-gradient-to-r ${weather.gradient} border border-white/[0.06] transition-all hover:border-white/[0.1]`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg" role="img" aria-label={loc.name}>{loc.flag}</span>
                                    <div>
                                        <div className="font-semibold text-gray-200 text-sm">{loc.name}</div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                            <WeatherIcon className="h-3 w-3" />
                                            <span>{weather.label}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-gray-100 font-mono text-lg">
                                        {Math.round(loc.data.temperature)}°
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                        <span className="flex items-center gap-0.5"><Wind className="h-2.5 w-2.5" />{Math.round(loc.data.windSpeed)}</span>
                                        <span className="flex items-center gap-0.5"><Droplets className="h-2.5 w-2.5" />{loc.data.humidity}%</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06] text-[10px] text-gray-600 text-center">
                Powered by Open-Meteo • Auto-refreshes every 30min
            </div>
        </div>
    )
}
