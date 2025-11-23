'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import SearchBar from '@/components/search/SearchBar'
import FilterPanel from '@/components/search/FilterPanel'
import SearchResults from '@/components/search/SearchResults'
import ExternalSearchToggle from '@/components/search/ExternalSearchToggle'
import { Model, SearchFilters } from '@/lib/types/models'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || undefined,
    page: 1,
    limit: 20,
  })
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [externalSearchEnabled, setExternalSearchEnabled] = useState(true)

  const handleAISearch = (query: string, results: any) => {
    setModels(results.models || [])
    setAiSuggestions(results.suggestions)
    setLoading(false)
  }

  useEffect(() => {
    // Load categories and tags
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error)

    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    const page = filters.page || 1
    const pageSize = filters.limit || 20
    const resultsPerSource = pageSize * 3 // Get 3x more for better sorting and pagination
    
    const params = new URLSearchParams()
    if (filters.query) params.set('q', filters.query)
    if (filters.category_id) params.set('category_id', filters.category_id)
    if (filters.tag_ids?.length) params.set('tag_ids', filters.tag_ids.join(','))
    if (filters.min_quality) params.set('min_quality', filters.min_quality.toString())
    if (filters.min_printability)
      params.set('min_printability', filters.min_printability.toString())
    if (filters.min_design) params.set('min_design', filters.min_design.toString())
    if (filters.is_free !== undefined) params.set('is_free', filters.is_free.toString())
    if (filters.sort_by) params.set('sort_by', filters.sort_by)
    params.set('page', page.toString())
    params.set('limit', resultsPerSource.toString())
    
    const searchPromises = [
      fetch(`/api/search?${params.toString()}&limit=${resultsPerSource}`).then((res) => res.json()),
    ]

    // Add external search if enabled
    if (externalSearchEnabled && filters.query) {
      const externalParams = new URLSearchParams()
      externalParams.set('q', filters.query)
      // Fetch multiple pages from external API for better sorting
      const externalPages = Math.ceil(resultsPerSource / 20) // Thingiverse returns 20 per page
      const externalPromises = []
      for (let p = 1; p <= Math.min(externalPages, 3); p++) { // Max 3 pages to avoid too many requests
        const extParams = new URLSearchParams(externalParams)
        extParams.set('page', p.toString())
        extParams.set('pageSize', '20')
        if (filters.sort_by) extParams.set('sort_by', filters.sort_by)
        if (filters.category_id) extParams.set('categories', filters.category_id)
        if (filters.tag_ids?.length) extParams.set('tags', filters.tag_ids.join(','))
        externalPromises.push(
          fetch(`/api/models/external?${extParams.toString()}`).then((res) => res.json())
        )
      }
      searchPromises.push(
        Promise.all(externalPromises).then((results) => {
          // Combine all external results
          const allExternalModels: Model[] = []
          let maxExternalTotal = 0
          results.forEach((result) => {
            if (result.models) {
              allExternalModels.push(...result.models)
            }
            if (result.total && result.total > maxExternalTotal) {
              maxExternalTotal = result.total
            }
          })
          return {
            models: allExternalModels,
            total: maxExternalTotal,
          }
        })
      )
    }

    Promise.all(searchPromises)
      .then((results) => {
        const allModels: Model[] = []
        let maxTotal = 0
        
        results.forEach((result) => {
          if (result.models) {
            allModels.push(...result.models)
          }
          // Use the highest total estimate
          if (result.total && result.total > maxTotal) {
            maxTotal = result.total
          }
        })
        
        // Remove duplicates based on ID
        const uniqueModels = allModels.filter(
          (model, index, self) =>
            index === self.findIndex((m) => m.id === model.id)
        )
        
        // Debug: check download_count
        if (uniqueModels.length > 0) {
          console.log('[Search] Sample model download_count:', {
            id: uniqueModels[0].id,
            name: uniqueModels[0].name,
            download_count: uniqueModels[0].download_count,
            hasDownloadCount: 'download_count' in uniqueModels[0],
          })
        }
        
        // Apply sorting to combined results
        const sortedModels = applySorting(uniqueModels, filters.sort_by || 'relevance')
        
        // Apply client-side pagination after sorting
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        const paginatedModels = sortedModels.slice(startIndex, endIndex)
        
        // Estimate total: if we got full results, assume there are more
        const hasMoreResults = sortedModels.length >= resultsPerSource
        const estimatedTotal = hasMoreResults 
          ? Math.max(maxTotal, page * pageSize + pageSize * 2) // Estimate more pages
          : sortedModels.length
        
        setModels(paginatedModels)
        setTotalResults(Math.max(maxTotal, estimatedTotal))
        setCurrentPage(page)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Search error:', error)
        setLoading(false)
      })
  }, [filters, externalSearchEnabled])

  const applySorting = (models: Model[], sortBy: string): Model[] => {
    const sorted = [...models]
    switch (sortBy) {
      case 'popularity':
        return sorted.sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      default:
        // Relevance - sort by download count and quality
        return sorted.sort((a, b) => {
          const aScore = (b.download_count || 0) + (b.average_quality || 0) * 100
          const bScore = (a.download_count || 0) + (a.average_quality || 0) * 100
          return bScore - aScore
        })
    }
  }

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <SearchBar initialQuery={filters.query} onAISearch={handleAISearch} />
        </div>
        <ExternalSearchToggle
          enabled={externalSearchEnabled}
          onChange={setExternalSearchEnabled}
        />
        {aiSuggestions && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>AI Suggesties:</strong> {aiSuggestions.keywords?.join(', ')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
              tags={tags}
            />
          </div>
          <div className="lg:col-span-3">
            <SearchResults 
              models={models} 
              loading={loading}
              currentPage={currentPage}
              totalResults={totalResults}
              pageSize={filters.limit || 20}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

