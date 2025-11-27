'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface SearchBarProps {
  initialQuery?: string
}

export default function SearchBar({ initialQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full relative z-20">
      <div className="relative flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-xl opacity-30 group-hover:opacity-100 blur transition duration-500 ${isFocused ? 'opacity-100' : ''}`}></div>
          <div className="relative flex items-center bg-gray-900/90 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="pl-4 text-gray-400">
              <svg className={`w-6 h-6 transition-colors duration-300 ${isFocused ? 'text-cyan-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Zoek naar 3D-modellen, categorieën, tags..."
              className="w-full bg-transparent border-none text-white placeholder-gray-500 px-4 py-4 text-lg focus:ring-0 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="pr-4 text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-white/10 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-shimmer" />
          Zoeken
        </motion.button>
      </div>
    </form>
  )
}
