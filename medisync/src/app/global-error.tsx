'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4F6F8] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="size-16 rounded-2xl bg-[#0D6B5E] flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
          </div>

          {/* Error icon */}
          <div className="flex justify-center mb-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <AlertTriangle className="size-7 text-red-500" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">Application Error</h1>

          <p className="text-sm text-gray-500 leading-relaxed mb-2">
            {isDev
              ? error.message || 'An unexpected error occurred.'
              : 'Something went wrong on our end. Please refresh the page or try again shortly.'}
          </p>

          {isDev && error.digest && (
            <p className="text-xs text-gray-400 font-mono bg-gray-100 rounded px-2 py-1 mb-4 inline-block">
              digest: {error.digest}
            </p>
          )}

          <div className="mt-6">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0D6B5E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a5a4f] transition-colors"
            >
              <RefreshCw className="size-4" />
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
