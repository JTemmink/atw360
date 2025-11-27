'use client'

import { useEffect, useState, Suspense, useCallback, useMemo, memo } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import SearchBar from '@/components/search/SearchBar'
import { Model, SearchFilters } from '@/lib/types/models'
import { translateNlToEn } from '@/lib/utils/translation'

// Lazy load heavy components
const FilterPanel = dynamic(() => import('@/components/search/FilterPanel'), {
  loading: () => <div className="h-64 bg-gray-800/50 rounded-2xl animate-pulse" />
})
const SearchResults = dynamic(() => import('@/components/search/SearchResults'), {
  loading: () => <div className="h-96 bg-gray-800/50 rounded-2xl animate-pulse" />
})

// Cache for categories and tags
let categoriesCache: { id: string; name: string; slug: string }[] | null = null
let tagsCache: { id: string; name: string }[] | null = null

// Category to English mapping (static, no need to recreate)
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
    sort_by: searchParams.get('sort_by') as SearchFilters['sort_by'] || 'popularity',
    pla_compatible: true,
  })
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>(categoriesCache || [])
  const [tags, setTags] = useState<{ id: string; name: string }[]>(tagsCache || [])

  // Load categories and tags only once (with caching)
  useEffect(() => {
    if (categoriesCache) {
      setCategories(categoriesCache)
    } else {
      fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => {
          const cats = (data.categories || []).map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug || cat.name.toLowerCase(),
          }))
          categoriesCache = cats
          setCategories(cats)
        })
        .catch(console.error)
    }

    if (tagsCache) {
      setTags(tagsCache)
    } else {
      fetch('/api/tags')
        .then((res) => res.json())
        .then((data) => {
          tagsCache = data.tags || []
          setTags(tagsCache)
        })
        .catch(console.error)
    }
  }, [])

  // Calculate relevance score for a model
  const calculateRelevanceScore = useCallback((model: Model, searchQuery: string): number => {
    if (!searchQuery) return 0
    
    const queryLower = searchQuery.toLowerCase().trim()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0)
    const nameLower = (model.name || '').toLowerCase()
    const descLower = (model.description || '').toLowerCase()
    const tagsLower = (model.tags || []).map((t: any) => (t.name || '').toLowerCase()).join(' ')
    
    let score = 0
    
    // Exact phrase match in name (highest priority)
    if (nameLower.includes(queryLower)) {
      score += 1000
      if (nameLower.startsWith(queryLower)) {
        score += 500
      }
    }
    
    // Exact phrase match in tags (very high priority)
    if (tagsLower.includes(queryLower)) {
      score += 800
    }
    
    // All words match in name
    const allWordsInName = queryWords.every(word => nameLower.includes(word))
    if (allWordsInName) {
      score += 600
      // Bonus for word order in name
      const nameWords = nameLower.split(/\s+/)
      let wordOrderMatch = 0
      let nameIndex = 0
      for (const queryWord of queryWords) {
        const foundIndex = nameWords.findIndex((w, i) => i >= nameIndex && w.includes(queryWord))
        if (foundIndex >= 0) {
          wordOrderMatch++
          nameIndex = foundIndex + 1
        }
      }
      if (wordOrderMatch === queryWords.length) {
        score += 300
      }
    }
    
    // All words match in tags
    const allWordsInTags = queryWords.every(word => tagsLower.includes(word))
    if (allWordsInTags) {
      score += 500
    }
    
    // Individual word matches
    queryWords.forEach((word, index) => {
      if (nameLower.includes(word)) {
        score += 100 - (index * 10)
      }
      if (tagsLower.includes(word)) {
        score += 80 - (index * 8)
      }
      if (descLower.includes(word)) {
        score += 20
      }
    })
    
    // Boost for popular/high quality models
    score += Math.min((model.download_count || 0) / 100, 50)
    if (model.average_quality) {
      score += model.average_quality * 10
    }
    
    return score
  }, [])

  // Memoized sorting function
  const applySorting = useCallback((models: Model[], sortBy: string, searchQuery?: string): Model[] => {
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
        // Relevance sorting with scoring
        if (searchQuery) {
          return sorted
            .map(model => ({
              model,
              score: calculateRelevanceScore(model, searchQuery)
            }))
            .filter(item => item.score > 0) // Only include models that match
            .sort((a, b) => b.score - a.score)
            .map(item => item.model)
        }
        // Fallback to popularity if no query
        return sorted.sort((a, b) => {
          const aScore = (b.download_count || 0) + (b.average_quality || 0) * 100
          const bScore = (a.download_count || 0) + (a.average_quality || 0) * 100
          return bScore - aScore
        })
    }
  }, [calculateRelevanceScore])

  useEffect(() => {
    const urlQuery = searchParams.get('q') || undefined
    if (urlQuery !== filters.query) {
      setFilters(prev => ({ ...prev, query: urlQuery, page: 1 }))
      return
    }
    
    if (filters.category_id && categories.length === 0) {
      return
    }
    
    const abortController = new AbortController()
    
    setLoading(true)
    const page = filters.page || 1
    const pageSize = filters.limit || 20
    // Haal meer resultaten op voor latere pagina's (genoeg buffer na filtering)
    // Voor pagina 1: 60 resultaten, pagina 2: 80, pagina 3: 100, etc.
    const resultsPerSource = pageSize * (page + 2)
    
    const originalQuery = filters.query || ''
    const translatedQuery = originalQuery ? translateNlToEn(originalQuery) : ''
    
    const params = new URLSearchParams()
    if (translatedQuery) params.set('q', translatedQuery)
    if (filters.category_id) params.set('category_id', filters.category_id)
    if (filters.tag_ids?.length) params.set('tag_ids', filters.tag_ids.join(','))
    if (filters.is_free !== undefined) params.set('is_free', filters.is_free.toString())
    if (filters.sort_by) params.set('sort_by', filters.sort_by)
    // Haal meer resultaten op vanaf pagina 1 (niet de huidige pagina)
    params.set('page', '1')
    params.set('limit', resultsPerSource.toString())
    
    // Start local and external search in parallel
    const localSearchPromise = fetch(`/api/search?${params.toString()}`, {
      signal: abortController.signal
    }).then((res) => res.json())

    // Build external search query
    let searchQuery = translatedQuery || ''
    if (filters.category_id && !translatedQuery) {
      const selectedCategory = categories.find(cat => cat.id === filters.category_id)
      if (selectedCategory) {
        searchQuery = categoryToEnglishMap[selectedCategory.name] || selectedCategory.name.toLowerCase()
      }
    } else if (filters.category_id && translatedQuery) {
      const selectedCategory = categories.find(cat => cat.id === filters.category_id)
      if (selectedCategory) {
        const englishTerms = categoryToEnglishMap[selectedCategory.name] || selectedCategory.name.toLowerCase()
        searchQuery = `${translatedQuery} ${englishTerms}`
      }
    }
    
    // Only add PLA to query if there's no specific search query
    // This allows specific searches like "Citroen BX" to work without being filtered
    if (filters.pla_compatible !== false && !translatedQuery) {
      // No specific query, so add PLA filter
      searchQuery = 'PLA'
    } else if (!searchQuery) {
      searchQuery = '*'
    }
    // If there's a specific query, don't add PLA to it - filter will be applied client-side

    // Haal meerdere pagina's op van externe API voor latere pagina's
    const externalPages = Math.min(Math.ceil(resultsPerSource / 20), 3) // Max 3 pagina's
    const externalPromises = []
    for (let p = 1; p <= externalPages; p++) {
      const externalParams = new URLSearchParams()
      externalParams.set('q', searchQuery)
      externalParams.set('page', p.toString())
      externalParams.set('pageSize', '20')
      externalParams.set('sort_by', filters.sort_by || (translatedQuery ? 'relevant' : 'popular'))
      externalPromises.push(
        fetch(`/api/models/external?${externalParams.toString()}`, {
          signal: abortController.signal
        }).then((res) => res.json()).catch(() => ({ models: [] }))
      )
    }
    
    const externalSearchPromise = Promise.all(externalPromises).then((results) => {
      const allExternalModels: Model[] = []
      let maxTotal = 0
      results.forEach((result) => {
        if (result.models) {
          allExternalModels.push(...result.models)
        }
        if (result.total && result.total > maxTotal) {
          maxTotal = result.total
        }
      })
      return { models: allExternalModels, total: maxTotal }
    })

    // Process both in parallel
    Promise.all([localSearchPromise, externalSearchPromise])
      .then(([localResult, externalResult]) => {
        if (abortController.signal.aborted) return
        
        const allModels: Model[] = [
          ...(localResult.models || []),
          ...(externalResult.models || [])
        ]
        
        const maxTotal = Math.max(localResult.total || 0, externalResult.total || 0)
        
        // Process models
        const uniqueModels = allModels.filter(
          (model, index, self) => index === self.findIndex((m) => m.id === model.id)
        )
        
        let filteredModels = uniqueModels
        
        // Apply is_free filter
        if (filters.is_free !== undefined) {
          filteredModels = filteredModels.filter((model) => {
            if (model.id.startsWith('thingiverse_')) return filters.is_free === true
            return model.is_free === filters.is_free
          })
        }
        
        // Apply PLA filter (check name, description, and tags)
        // Only apply if there's no specific search query, or if the query doesn't match specific terms
        if (filters.pla_compatible !== false) {
          const hasSpecificQuery = originalQuery && originalQuery.trim().length > 0
          
          filteredModels = filteredModels.filter((model) => {
            const nameLower = (model.name || '').toLowerCase()
            const descLower = (model.description || '').toLowerCase()
            const tagsLower = (model.tags || []).map((t: any) => (t.name || '').toLowerCase()).join(' ')
            const allText = `${nameLower} ${descLower} ${tagsLower}`.toLowerCase()
            
            // If there's a specific query and the model matches it, be more lenient with PLA filter
            if (hasSpecificQuery) {
              const queryLower = originalQuery.toLowerCase()
              const queryWords = queryLower.split(/\s+/)
              const matchesQuery = queryWords.some(word => 
                nameLower.includes(word) || 
                descLower.includes(word) || 
                tagsLower.includes(word)
              )
              
              // If model matches the specific query, only exclude if explicitly incompatible
              if (matchesQuery) {
                const isExplicitlyIncompatible = 
                  allText.includes('resin only') ||
                  allText.includes('sla only') ||
                  allText.includes('dlp only') ||
                  allText.includes('sls only') ||
                  (allText.includes('abs only') && !allText.includes('pla')) ||
                  (allText.includes('petg only') && !allText.includes('pla'))
                
                return !isExplicitlyIncompatible
              }
            }
            
            // Standard PLA filter for non-specific queries
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
        
        // Apply sorting with search query for relevance
        const hasAnyFilters = filters.category_id || filters.tag_ids?.length || filters.is_free !== undefined
        const defaultSort = (!filters.query && !hasAnyFilters) ? 'popularity' : (filters.sort_by || 'relevance')
        const sortedModels = applySorting(filteredModels, defaultSort, originalQuery)
        
        // Pagination - nu hebben we genoeg resultaten voor latere pagina's
        const startIndex = (page - 1) * pageSize
        const paginatedModels = sortedModels.slice(startIndex, startIndex + pageSize)
        
        // Beter totaal schatten: gebruik het maximum van wat we hebben of een schatting gebaseerd op beschikbare resultaten
        let estimatedTotal = sortedModels.length
        if (sortedModels.length >= resultsPerSource) {
          // Als we alle opgehaalde resultaten hebben gebruikt, schat dat er meer zijn
          estimatedTotal = Math.max(maxTotal, sortedModels.length + pageSize)
        } else {
          // Als we minder hebben dan opgehaald, gebruik het werkelijke aantal
          estimatedTotal = sortedModels.length
        }
        
        setModels(paginatedModels)
        setTotalResults(estimatedTotal)
        setCurrentPage(page)
        setLoading(false)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Search error:', error)
          setLoading(false)
        }
      })
    
    return () => abortController.abort()
  }, [filters, categories, searchParams, applySorting])

  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters)
  }, [])

  const handleSortChange = useCallback((sort: string) => {
    setFilters(prev => ({ ...prev, sort_by: sort as SearchFilters['sort_by'] }))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground pt-20 md:pt-24 pb-8 relative overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="mb-6 md:mb-8 max-w-4xl mx-auto">
          <SearchBar initialQuery={filters.query} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
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
              onSortChange={handleSortChange}
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
      <div className="min-h-screen bg-gray-950 py-20 pt-24">
        <div className="container mx-auto px-4 flex justify-center">
          <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
