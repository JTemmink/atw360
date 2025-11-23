'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SearchBarProps {
  initialQuery?: string
  onAISearch?: (query: string, results: any) => void
  showExternalSearch?: boolean
}

export default function SearchBar({ initialQuery = '', onAISearch, showExternalSearch = true }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const [isAISearch, setIsAISearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isAISearch && onAISearch) {
      setLoading(true)
      try {
        const response = await fetch('/api/ai-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        })
        const data = await response.json()
        onAISearch(query, data)
      } catch (error) {
        console.error('AI search error:', error)
      } finally {
        setLoading(false)
      }
    } else {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek naar 3D-modellen, categorieën, tags..."
            className="w-full rounded-xl border-2 border-gray-200 pl-12 pr-12 py-4 text-lg focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm hover:shadow-md"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {showExternalSearch && (
          <label className="flex items-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50 px-5 rounded-xl hover:from-indigo-100 hover:to-purple-100 border-2 border-transparent hover:border-indigo-200 transition-all">
            <input
              type="checkbox"
              checked={isAISearch}
              onChange={(e) => setIsAISearch(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-sm font-semibold text-gray-700">AI Zoek</span>
          </label>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-xl hover:scale-105 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Zoeken...
            </span>
          ) : (
            'Zoeken'
          )}
        </button>
      </div>
    </form>
  )
}

