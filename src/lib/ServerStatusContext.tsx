import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { API_BASE, apiGet } from './api'

interface ServerStatus {
    aiProvider: 'mock' | 'openai' | 'gemini'
    firebaseMode: 'emulator' | 'real'
    version?: string
}

interface ServerStatusContextType {
    isConnected: boolean | null // null = loading
    status: ServerStatus | null
    refetchStatus: () => Promise<void>
}

const ServerStatusContext = createContext<ServerStatusContextType | undefined>(undefined)

export function ServerStatusProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState<boolean | null>(null)
    const [status, setStatus] = useState<ServerStatus | null>(null)

    const checkStatus = async () => {
        try {
            const response = await fetch(`${API_BASE}/dashboard/status`)
            const contentType = response.headers.get('content-type') ?? ''

            if (!response.ok || contentType.includes('text/html')) {
                setIsConnected(false)
                setStatus(null)
                return
            }

            const data = await response.json()
            // API returns { data: { ... } }
            if (data && data.data) {
                setStatus(data.data as ServerStatus)
                setIsConnected(true)
            } else {
                setIsConnected(false)
            }

        } catch (error) {
            console.error('Failed to connect to backend:', error)
            setIsConnected(false)
            setStatus(null)
        }
    }

    useEffect(() => {
        checkStatus()
    }, [])

    return (
        <ServerStatusContext.Provider value={{ isConnected, status, refetchStatus: checkStatus }}>
            {children}
        </ServerStatusContext.Provider>
    )
}

export function useServerStatus() {
    const context = useContext(ServerStatusContext)
    if (context === undefined) {
        throw new Error('useServerStatus must be used within a ServerStatusProvider')
    }
    return context
}
