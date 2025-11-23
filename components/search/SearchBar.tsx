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
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek naar 3D-modellen..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        {showExternalSearch && (
          <label className="flex items-center gap-2 cursor-pointer bg-gray-100 px-4 rounded-lg hover:bg-gray-200">
            <input
              type="checkbox"
              checked={isAISearch}
              onChange={(e) => setIsAISearch(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">AI Zoek</span>
          </label>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {loading ? 'Zoeken...' : 'Zoeken'}
        </button>
      </div>
    </form>
  )
}

