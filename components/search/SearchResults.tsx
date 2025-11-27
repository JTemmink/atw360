'use client'

import { memo } from 'react'
import { Model } from '@/lib/types/models'
import Link from 'next/link'
import Image from 'next/image'

interface SearchResultsProps {
  models: Model[]
  loading?: boolean
  currentPage?: number
  totalResults?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  sortBy?: string
  onSortChange?: (sort: string) => void
}

// Memoized model card for performance
const ModelCard = memo(function ModelCard({ model }: { model: Model }) {
  return (
    <div className="group relative bg-gray-900/40 rounded-2xl border border-white/10 overflow-hidden hover:border-cyan-500/50 transition-colors duration-200 hover:-translate-y-1">
      <Link href={`/models/${model.id}`} className="block">
        <div className="relative overflow-hidden bg-gray-800 aspect-video">
          {model.thumbnail_url ? (
            <img
              src={model.thumbnail_url}
              alt={model.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {model.is_free && (
            <span className="absolute top-2 left-2 bg-green-500/90 text-white text-xs font-bold px-2 py-0.5 rounded">
              GRATIS
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-bold text-base mb-1 text-gray-100 line-clamp-2 group-hover:text-cyan-400 transition-colors">
            {model.name}
          </h3>
          {model.description && (
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
              {model.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {(model.download_count ?? 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {(model.view_count ?? 0).toLocaleString()}
              </span>
            </div>

            {model.average_quality && (
              <span className="flex items-center gap-1 text-yellow-500">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                {model.average_quality.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
})

function SearchResults({ 
  models, 
  loading,
  currentPage = 1,
  totalResults = 0,
  pageSize = 20,
  onPageChange,
  sortBy = 'relevance',
  onSortChange
}: SearchResultsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-2xl h-72 animate-pulse" />
        ))}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Geen modellen gevonden</h3>
        <p className="text-gray-400 text-sm">Probeer andere zoektermen of filters</p>
      </div>
    )
  }

  const totalPages = Math.ceil(totalResults / pageSize) || Math.ceil(models.length / pageSize)

  return (
    <>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3 bg-gray-900/30 p-3 rounded-xl border border-white/5">
        {totalResults > 0 && (
          <p className="text-xs text-gray-400">
            <span className="text-cyan-400 font-medium">{((currentPage - 1) * pageSize + 1)}-{Math.min(currentPage * pageSize, totalResults)}</span> van {totalResults.toLocaleString()}
          </p>
        )}
        {onSortChange && (
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-gray-900 text-gray-200 text-xs rounded-lg border border-white/10 px-3 py-1.5 focus:border-cyan-500 focus:outline-none"
          >
            <option value="relevance">Relevantie</option>
            <option value="popularity">Populariteit</option>
            <option value="newest">Nieuwste</option>
            <option value="oldest">Oudste</option>
          </select>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {models.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-white/10 bg-gray-900/50 text-gray-300 text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
          >
            Vorige
          </button>
          
          <span className="px-4 py-2 text-sm text-gray-400">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 rounded-lg border border-white/10 bg-gray-900/50 text-gray-300 text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
          >
            Volgende
          </button>
        </div>
      )}
    </>
  )
}

export default memo(SearchResults)
