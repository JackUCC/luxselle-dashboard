/**
 * Error boundary: catches render errors in child tree and shows fallback UI with reload.
 * @see docs/CODE_REFERENCE.md
 * References: React error boundaries, lucide-react
 */
import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-lux-900">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-lux-500">
              An unexpected error occurred. Please try reloading the page.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-lg bg-lux-900 px-4 py-2 text-sm font-medium text-white hover:bg-lux-800 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-6 rounded-lg bg-lux-100 p-4 text-left text-xs text-red-600 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
