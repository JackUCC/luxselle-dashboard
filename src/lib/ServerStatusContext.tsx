import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { apiGet } from './api'

interface ServerStatus {
    aiRoutingMode: 'dynamic' | 'openai' | 'perplexity'
    providerAvailability: {
        openai: boolean
        perplexity: boolean
        vision: boolean
    }
    lastProviderByTask?: Partial<Record<'web_search' | 'structured_extraction_json' | 'freeform_generation' | 'vision_analysis', 'openai' | 'perplexity'>>
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
            const data = await apiGet<{ data?: ServerStatus }>('/dashboard/status')
            if (data?.data) {
                setStatus(data.data)
                setIsConnected(true)
            } else {
                setIsConnected(false)
                setStatus(null)
            }
        } catch {
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
