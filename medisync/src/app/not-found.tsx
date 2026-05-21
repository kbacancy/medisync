import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F6F8] px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="size-16 rounded-2xl bg-[#0D6B5E] flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
        </div>

        {/* 404 */}
        <p className="text-8xl font-extrabold text-[#0D6B5E] leading-none mb-4">404</p>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Page not found</h1>

        {/* Description */}
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the URL or head back to a familiar page.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D6B5E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a5a4f] transition-colors"
          >
            <Home className="size-4" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
