'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SearchBar from '@/components/search/SearchBar'
import FilterPanel from '@/components/search/FilterPanel'
import SearchResults from '@/components/search/SearchResults'
import ExternalSearchToggle from '@/components/search/ExternalSearchToggle'
import { Model, SearchFilters } from '@/lib/types/models'

function SearchPageContent() {
  const searchParams = useSearchParams()
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || undefined,
    category_id: searchParams.get('category_id') || undefined,
    page: 1,
    limit: 20,
    sort_by: searchParams.get('sort_by') as SearchFilters['sort_by'] || 'popularity', // Default to popularity for "verken modelen"
  })
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([])
  const [tags, setTags] = useState<{ id: string; name: string }[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [externalSearchEnabled, setExternalSearchEnabled] = useState(true)
  
  // Mapping van Nederlandse categorie namen naar Engelse zoektermen voor Thingiverse
  const categoryToEnglishMap: Record<string, string> = {
    'Decoratie': 'decoration decorative',
    'Speelgoed': 'toy toys',
    'Gereedschap': 'tool tools hardware',
    'Kunst': 'art sculpture',
    'Functioneel': 'functional utility',
    'Miniaturen': 'miniature mini',
    'Organizers': 'organizer storage',
    'Sieraden': 'jewelry jewelry',
  }

  const handleAISearch = (query: string, results: any) => {
    setModels(results.models || [])
    setAiSuggestions(results.suggestions)
    setLoading(false)
  }

  useEffect(() => {
    // Load categories and tags
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        // Ensure categories have slug property
        const cats = (data.categories || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug || cat.name.toLowerCase(),
        }))
        setCategories(cats)
      })
      .catch(console.error)

    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    // Don't search if categories haven't loaded yet and we need them
    if (filters.category_id && categories.length === 0) {
      return
    }
    
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
    // Show results if: query exists, filters are set, or no query/filters (show popular models)
    const hasFilters = filters.category_id || filters.tag_ids?.length || filters.is_free !== undefined
    const shouldSearchExternal = externalSearchEnabled && (filters.query || hasFilters || (!filters.query && !hasFilters))
    
    if (shouldSearchExternal) {
      const externalParams = new URLSearchParams()
      let searchQuery = filters.query || ''
      
      // If category is selected, add English category terms to the query
      if (filters.category_id && !filters.query) {
        const selectedCategory = categories.find(cat => cat.id === filters.category_id)
        console.log('[Search] Category filter:', {
          category_id: filters.category_id,
          selectedCategory,
          categoriesLength: categories.length,
          categoryMap: categoryToEnglishMap,
        })
        if (selectedCategory) {
          const englishTerms = categoryToEnglishMap[selectedCategory.name] || selectedCategory.name.toLowerCase()
          searchQuery = englishTerms
          console.log('[Search] Using category search terms:', englishTerms)
        } else {
          console.warn('[Search] Category not found:', filters.category_id, 'Available categories:', categories.map(c => c.id))
        }
      } else if (filters.category_id && filters.query) {
        // Combine query with category terms
        const selectedCategory = categories.find(cat => cat.id === filters.category_id)
        if (selectedCategory) {
          const englishTerms = categoryToEnglishMap[selectedCategory.name] || selectedCategory.name.toLowerCase()
          searchQuery = `${filters.query} ${englishTerms}`
        } else {
          searchQuery = filters.query
        }
      }
      
      // Always add PLA to the query to filter for PLA-compatible models
      if (searchQuery) {
        // Add PLA to the query if not already present
        const queryLower = searchQuery.toLowerCase()
        if (!queryLower.includes('pla')) {
          searchQuery = `${searchQuery} PLA`
        }
        externalParams.set('q', searchQuery)
        console.log('[Search] External search query (with PLA filter):', searchQuery)
      } else {
        // Use PLA as default search term
        externalParams.set('q', 'PLA')
      }
      // Fetch multiple pages from external API for better sorting
      const externalPages = Math.ceil(resultsPerSource / 20) // Thingiverse returns 20 per page
      const externalPromises = []
      for (let p = 1; p <= Math.min(externalPages, 3); p++) { // Max 3 pages to avoid too many requests
        const extParams = new URLSearchParams(externalParams)
        extParams.set('page', p.toString())
        extParams.set('pageSize', '20')
        // Default to 'popular' sort if no query (for "verken modelen")
        extParams.set('sort_by', filters.sort_by || (filters.query ? 'relevant' : 'popular'))
        // Don't pass category_id to Thingiverse - we've added it to the query instead
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
        
        // Apply is_free filter client-side (for combined results)
        let filteredModels = uniqueModels
        if (filters.is_free !== undefined) {
          filteredModels = uniqueModels.filter((model) => {
            // External models (Thingiverse) are always free
            if (model.id.startsWith('thingiverse_')) {
              return filters.is_free === true
            }
            return model.is_free === filters.is_free
          })
        }
        
        // Filter for PLA-compatible models suitable for Bambu P1S/P2S
        filteredModels = filteredModels.filter((model) => {
          const nameLower = (model.name || '').toLowerCase()
          const descLower = (model.description || '').toLowerCase()
          const tagsLower = (model.tags || []).map(t => (t.name || '').toLowerCase()).join(' ')
          const allText = `${nameLower} ${descLower} ${tagsLower}`.toLowerCase()
          
          // Check for PLA compatibility
          const hasPLA = allText.includes('pla') || 
                        allText.includes('polylactic acid') ||
                        tagsLower.includes('pla')
          
          // Check for Bambu P1S/P2S compatibility or general FDM compatibility
          // Most PLA models work on Bambu printers, so we check for:
          // - Explicit Bambu mentions
          // - P1S/P2S mentions
          // - General FDM/3D printer compatibility (most models are)
          // - No explicit exclusions (like "resin only", "SLA only", etc.)
          const hasBambuCompatibility = 
            allText.includes('bambu') ||
            allText.includes('p1s') ||
            allText.includes('p2s') ||
            allText.includes('x1') ||
            allText.includes('fdm') ||
            allText.includes('fused deposition') ||
            !allText.includes('resin only') &&
            !allText.includes('sla only') &&
            !allText.includes('dlp only') &&
            !allText.includes('sls only')
          
          // If model explicitly mentions incompatible materials, exclude it
          const hasIncompatibleMaterial = 
            (allText.includes('abs') && !allText.includes('pla')) ||
            (allText.includes('petg') && !allText.includes('pla')) ||
            (allText.includes('tpu') && !allText.includes('pla')) ||
            allText.includes('resin') ||
            allText.includes('sla') ||
            allText.includes('dlp') ||
            allText.includes('sls')
          
          // Include if: has PLA AND (has Bambu compatibility OR no incompatible materials)
          return hasPLA && (hasBambuCompatibility || !hasIncompatibleMaterial)
        })
        
        // Debug: check download_count
        if (filteredModels.length > 0) {
          console.log('[Search] Sample model download_count:', {
            id: filteredModels[0].id,
            name: filteredModels[0].name,
            download_count: filteredModels[0].download_count,
            is_free: filteredModels[0].is_free,
            hasDownloadCount: 'download_count' in filteredModels[0],
          })
        }
        
        // Apply sorting to combined results
        // If no query and no filters, default to popularity (most popular of the week)
        const hasAnyFilters = filters.category_id || filters.tag_ids?.length || filters.is_free !== undefined
        const defaultSort = (!filters.query && !hasAnyFilters) ? 'popularity' : (filters.sort_by || 'relevance')
        const sortedModels = applySorting(filteredModels, defaultSort)
        
        // If no query and no filters, filter to models from the last week for "most popular of the week"
        let finalModels = sortedModels
        if (!filters.query && !hasAnyFilters) {
          const oneWeekAgo = new Date()
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          finalModels = sortedModels.filter((model) => {
            const modelDate = new Date(model.created_at)
            return modelDate >= oneWeekAgo
          })
          // If we don't have enough from last week, show all popular models
          if (finalModels.length < pageSize) {
            finalModels = sortedModels
          }
        } else {
          finalModels = sortedModels
        }
        
        // Apply client-side pagination after sorting
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        const paginatedModels = finalModels.slice(startIndex, endIndex)
        
        // Estimate total: if we got full results, assume there are more
        const hasMoreResults = finalModels.length >= resultsPerSource
        const estimatedTotal = hasMoreResults 
          ? Math.max(maxTotal, page * pageSize + pageSize * 2) // Estimate more pages
          : finalModels.length
        
        setModels(paginatedModels)
        setTotalResults(Math.max(maxTotal, estimatedTotal))
        setCurrentPage(page)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Search error:', error)
        setLoading(false)
      })
  }, [filters, externalSearchEnabled, categories])

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <SearchBar initialQuery={filters.query} onAISearch={handleAISearch} />
        </div>
        <ExternalSearchToggle
          enabled={externalSearchEnabled}
          onChange={setExternalSearchEnabled}
        />
        {aiSuggestions && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 shadow-sm">
            <p className="text-sm text-indigo-800">
              <strong className="font-semibold">AI Suggesties:</strong> {aiSuggestions.keywords?.join(', ')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
              tags={tags}
            />
          </div>
          <div className="lg:col-span-4">
            <SearchResults 
              models={models} 
              loading={loading}
              currentPage={currentPage}
              totalResults={totalResults}
              pageSize={filters.limit || 20}
              onPageChange={handlePageChange}
              sortBy={filters.sort_by || 'relevance'}
              onSortChange={(sort) => setFilters({ ...filters, sort_by: sort as SearchFilters['sort_by'] })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-600">Laden...</p>
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}

