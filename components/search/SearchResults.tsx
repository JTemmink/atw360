'use client'

import { Model } from '@/lib/types/models'
import Link from 'next/link'
import FavoriteButton from '@/components/favorites/FavoriteButton'

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

export default function SearchResults({ 
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 animate-pulse rounded-lg h-64"
          />
        ))}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Geen modellen gevonden</p>
        <p className="text-gray-400 text-sm mt-2">
          Probeer andere zoektermen of filters
        </p>
      </div>
    )
  }
  const totalPages = Math.ceil(totalResults / pageSize) || Math.ceil(models.length / pageSize)

  const Pagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxPages = 7
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2))
    let endPage = Math.min(totalPages, startPage + maxPages - 1)

    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-12">
        <button
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-5 py-2.5 rounded-xl border-2 border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 font-medium transition-all disabled:hover:bg-transparent"
        >
          Vorige
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange?.(1)}
              className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-medium transition-all"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-400">...</span>}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange?.(page)}
            className={`px-4 py-2.5 rounded-xl border-2 font-semibold transition-all ${
              page === currentPage
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-lg scale-110'
                : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2 text-gray-400">...</span>}
            <button
              onClick={() => onPageChange?.(totalPages)}
              className="px-4 py-2 rounded-xl border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-medium transition-all"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-5 py-2.5 rounded-xl border-2 border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 font-medium transition-all disabled:hover:bg-transparent"
        >
          Volgende
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        {totalResults > 0 && (
          <p className="text-sm font-medium text-gray-700">
            Toont <span className="font-bold text-indigo-600">{((currentPage - 1) * pageSize + 1)}-{Math.min(currentPage * pageSize, totalResults)}</span> van <span className="font-bold text-indigo-600">{totalResults.toLocaleString()}</span> resultaten
          </p>
        )}
        {onSortChange && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Sorteren op:</label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
            >
              <option value="relevance">Relevantie</option>
              <option value="popularity">Populariteit</option>
              <option value="newest">Nieuwste</option>
              <option value="oldest">Oudste</option>
            </select>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => (
          <div
            key={model.id}
            className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 relative hover:-translate-y-1"
          >
            <Link href={`/models/${model.id}`} className="block">
              <div className="relative overflow-hidden bg-gray-100">
                {model.thumbnail_url ? (
                  <img
                    src={model.thumbnail_url}
                    alt={model.name}
                    className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-56 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg mb-2 line-clamp-2 text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {model.name}
                </h3>
                {model.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="font-medium">{(model.download_count ?? 0).toLocaleString()}</span>
                  </div>
                  {model.average_quality && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      <span className="font-semibold">{model.average_quality.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
            <div className="absolute top-3 right-3 z-10">
              <FavoriteButton 
                modelId={model.id} 
                className="bg-white/90 backdrop-blur-md rounded-full p-2 shadow-lg hover:bg-white hover:scale-110 transition-all"
                isExternal={model.id.startsWith('thingiverse_')}
                externalUrl={(model as any).external_url}
              />
            </div>
          </div>
        ))}
      </div>
      
      <Pagination />
    </>
  )
}

