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
}

export default function SearchResults({ 
  models, 
  loading,
  currentPage = 1,
  totalResults = 0,
  pageSize = 20,
  onPageChange
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
      <div className="flex items-center justify-center gap-2 mt-8">
        <button
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Vorige
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange?.(1)}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange?.(page)}
            className={`px-4 py-2 rounded-lg border ${
              page === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <button
              onClick={() => onPageChange?.(totalPages)}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Volgende
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 text-sm text-gray-600">
        {totalResults > 0 && (
          <span>
            {((currentPage - 1) * pageSize + 1)}-{Math.min(currentPage * pageSize, totalResults)} van {totalResults} resultaten
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => (
          <div
            key={model.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow relative"
          >
            <Link href={`/models/${model.id}`} className="block">
              {model.thumbnail_url ? (
                <img
                  src={model.thumbnail_url}
                  alt={model.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">Geen afbeelding</span>
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                  {model.name}
                </h3>
                {model.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {model.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {(model.download_count ?? 0).toLocaleString()} downloads
                  </span>
                  {model.average_quality && (
                    <span>⭐ {model.average_quality.toFixed(1)}</span>
                  )}
                </div>
              </div>
            </Link>
            <div className="absolute top-2 right-2 z-10">
              <FavoriteButton 
                modelId={model.id} 
                className="text-2xl bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-md hover:bg-white transition-colors"
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

