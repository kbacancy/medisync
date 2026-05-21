'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-50 mb-4">
            <AlertTriangle className="size-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
            {process.env.NODE_ENV === 'development' && this.state.error
              ? this.state.error.message
              : 'An unexpected error occurred. Please try again or contact support if the issue persists.'}
          </p>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0D6B5E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a5a4f] transition-colors"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component that wraps a component in an ErrorBoundary.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`
  return WrappedComponent
}
