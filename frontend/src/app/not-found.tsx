import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray px-4">
      <div className="text-center">
        <p className="font-display text-8xl font-extrabold text-brand-orange mb-4">404</p>
        <h1 className="font-display text-3xl font-bold text-brand-dark mb-3">Page not found</h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-brand-orange text-white font-semibold px-7 py-3 rounded-full hover:bg-orange-600 transition-colors"
        >
          Back to Home <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}
