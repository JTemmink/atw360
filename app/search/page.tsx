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
    pla_compatible: true, // Default to true (PLA/Bambu filter enabled)
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
    // Sync filters with URL params
    const urlQuery = searchParams.get('q') || undefined
    if (urlQuery !== filters.query) {
      setFilters(prev => ({ ...prev, query: urlQuery, page: 1 }))
      return // Wait for state update
    }
    
    // Don't search if categories haven't loaded yet and we need them
    if (filters.category_id && categories.length === 0) {
      return
    }
    
    // Abort controller to cancel previous requests
    const abortController = new AbortController()
    
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
    
    // Start with local search first (usually faster)
    const localSearchPromise = fetch(`/api/search?${params.toString()}&limit=${resultsPerSource}`, {
      signal: abortController.signal
    }).then((res) => res.json())

    // Process local results immediately when ready
    localSearchPromise
      .then((localResult) => {
        if (abortController.signal.aborted) return
        
        if (localResult.models && localResult.models.length > 0) {
          // Show local results immediately
          const processedLocal = processAndDisplayModels(localResult.models, localResult.total || 0, true)
          if (processedLocal && !abortController.signal.aborted) {
            setModels(processedLocal.paginatedModels)
            setTotalResults(processedLocal.total)
            setCurrentPage(page)
            setLoading(false) // Stop loading once we have some results
          }
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Local search error:', error)
        }
      })

    // Add external search if enabled (runs in parallel)
    const hasFilters = filters.category_id || filters.tag_ids?.length || filters.is_free !== undefined
    const shouldSearchExternal = externalSearchEnabled && (filters.query || hasFilters || (!filters.query && !hasFilters))
    
    if (shouldSearchExternal) {
      const externalParams = new URLSearchParams()
      let searchQuery = filters.query || ''
      
      // If category is selected, add English category terms to the query
      if (filters.category_id && !filters.query) {
        const selectedCategory = categories.find(cat => cat.id === filters.category_id)
        if (selectedCategory) {
          const englishTerms = categoryToEnglishMap[selectedCategory.name] || selectedCategory.name.toLowerCase()
          searchQuery = englishTerms
        }
      } else if (filters.category_id && filters.query) {
        const selectedCategory = categories.find(cat => cat.id === filters.category_id)
        if (selectedCategory) {
          const englishTerms = categoryToEnglishMap[selectedCategory.name] || selectedCategory.name.toLowerCase()
          searchQuery = `${filters.query} ${englishTerms}`
        } else {
          searchQuery = filters.query
        }
      }
      
      // Add PLA to the query if PLA filter is enabled
      if (filters.pla_compatible !== false) {
        if (searchQuery) {
          const queryLower = searchQuery.toLowerCase()
          if (!queryLower.includes('pla')) {
            searchQuery = `${searchQuery} PLA`
          }
          externalParams.set('q', searchQuery)
        } else {
          externalParams.set('q', 'PLA')
        }
      } else {
        if (searchQuery) {
          externalParams.set('q', searchQuery)
        } else {
          externalParams.set('q', '*')
        }
      }
      
      // Reduce external pages to 1-2 for faster loading (was 3)
      const externalPages = Math.min(Math.ceil(resultsPerSource / 20), 2)
      const externalPromises = []
      for (let p = 1; p <= externalPages; p++) {
        const extParams = new URLSearchParams(externalParams)
        extParams.set('page', p.toString())
        extParams.set('pageSize', '20')
        extParams.set('sort_by', filters.sort_by || (filters.query ? 'relevant' : 'popular'))
        if (filters.tag_ids?.length) extParams.set('tags', filters.tag_ids.join(','))
        externalPromises.push(
          fetch(`/api/models/external?${extParams.toString()}`, {
            signal: abortController.signal
          }).then((res) => res.json())
        )
      }
      
      // Process external results when ready and merge with local
      Promise.all([localSearchPromise, ...externalPromises])
        .then((results) => {
          if (abortController.signal.aborted) return
          
          const allModels: Model[] = []
          let maxTotal = 0
          
          results.forEach((result) => {
            if (result.models) {
              allModels.push(...result.models)
            }
            if (result.total && result.total > maxTotal) {
              maxTotal = result.total
            }
          })
          
          // Process and display combined results
          const processed = processAndDisplayModels(allModels, maxTotal, false)
          if (processed && !abortController.signal.aborted) {
            setModels(processed.paginatedModels)
            setTotalResults(processed.total)
            setCurrentPage(page)
            setLoading(false)
          }
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('Search error:', error)
            if (!abortController.signal.aborted) {
              setLoading(false)
            }
          }
        })
    } else {
      // No external search, just process local results
      localSearchPromise
        .then((result) => {
          if (abortController.signal.aborted) return
          const processed = processAndDisplayModels(result.models || [], result.total || 0, false)
          if (processed && !abortController.signal.aborted) {
            setModels(processed.paginatedModels)
            setTotalResults(processed.total)
            setCurrentPage(page)
            setLoading(false)
          }
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('Search error:', error)
            if (!abortController.signal.aborted) {
              setLoading(false)
            }
          }
        })
    }

    // Helper function to process models
    function processAndDisplayModels(allModels: Model[], maxTotal: number, isPartial: boolean) {
      if (abortController.signal.aborted) return null
      
      // Remove duplicates based on ID
      const uniqueModels = allModels.filter(
        (model, index, self) =>
          index === self.findIndex((m) => m.id === model.id)
      )
      
      // Apply is_free filter client-side
      let filteredModels = uniqueModels
      if (filters.is_free !== undefined) {
        filteredModels = uniqueModels.filter((model) => {
          if (model.id.startsWith('thingiverse_')) {
            return filters.is_free === true
          }
          return model.is_free === filters.is_free
        })
      }
      
      // Filter for PLA-compatible models
      if (filters.pla_compatible !== false) {
        filteredModels = filteredModels.filter((model) => {
          const nameLower = (model.name || '').toLowerCase()
          const descLower = (model.description || '').toLowerCase()
          const tagsLower = (model.tags || []).map(t => (t.name || '').toLowerCase()).join(' ')
          const allText = `${nameLower} ${descLower} ${tagsLower}`.toLowerCase()
          
          const hasPLA = allText.includes('pla') || 
                        allText.includes('polylactic acid') ||
                        tagsLower.includes('pla')
          
          const hasBambuCompatibility = 
            allText.includes('bambu') ||
            allText.includes('p1s') ||
            allText.includes('p2s') ||
            allText.includes('x1') ||
            allText.includes('fdm') ||
            allText.includes('fused deposition') ||
            (!allText.includes('resin only') &&
             !allText.includes('sla only') &&
             !allText.includes('dlp only') &&
             !allText.includes('sls only'))
          
          const hasIncompatibleMaterial = 
            (allText.includes('abs') && !allText.includes('pla')) ||
            (allText.includes('petg') && !allText.includes('pla')) ||
            (allText.includes('tpu') && !allText.includes('pla')) ||
            (allText.includes('resin') && !allText.includes('pla')) ||
            (allText.includes('sla') && !allText.includes('pla')) ||
            (allText.includes('dlp') && !allText.includes('pla')) ||
            (allText.includes('sls') && !allText.includes('pla'))
          
          return hasPLA && (hasBambuCompatibility || !hasIncompatibleMaterial)
        })
      }
      
      // Apply sorting
      const hasAnyFilters = filters.category_id || filters.tag_ids?.length || filters.is_free !== undefined
      const defaultSort = (!filters.query && !hasAnyFilters) ? 'popularity' : (filters.sort_by || 'relevance')
      const sortedModels = applySorting(filteredModels, defaultSort)
      
      // Filter to last week if no query/filters
      let finalModels = sortedModels
      if (!filters.query && !hasAnyFilters) {
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        finalModels = sortedModels.filter((model) => {
          const modelDate = new Date(model.created_at)
          return modelDate >= oneWeekAgo
        })
        if (finalModels.length < pageSize) {
          finalModels = sortedModels
        }
      }
      
      // Apply pagination
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedModels = finalModels.slice(startIndex, endIndex)
      
      // Estimate total
      const hasMoreResults = finalModels.length >= resultsPerSource
      const estimatedTotal = hasMoreResults 
        ? Math.max(maxTotal, page * pageSize + pageSize * 2)
        : finalModels.length
      
      return {
        paginatedModels,
        total: Math.max(maxTotal, estimatedTotal),
      }
    }
    
    // Cleanup: abort ongoing requests when component unmounts or dependencies change
    return () => {
      abortController.abort()
    }
  }, [filters, externalSearchEnabled, categories, searchParams])

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

