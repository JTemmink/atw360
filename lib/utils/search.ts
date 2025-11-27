import { SearchFilters, Model } from '@/lib/types/models'
import { createClient } from '@/lib/supabase/server'

// Calculate relevance score for a model based on search query
function calculateRelevanceScore(model: Model, searchQuery: string): number {
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
    // Bonus if it's at the start
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
  
  // Individual word matches in name
  queryWords.forEach((word, index) => {
    if (nameLower.includes(word)) {
      score += 100 - (index * 10) // First word is more important
    }
  })
  
  // Individual word matches in tags
  queryWords.forEach((word, index) => {
    if (tagsLower.includes(word)) {
      score += 80 - (index * 8)
    }
  })
  
  // Individual word matches in description (lower priority)
  queryWords.forEach((word) => {
    if (descLower.includes(word)) {
      score += 20
    }
  })
  
  // Boost for popular models
  score += Math.min((model.download_count || 0) / 100, 50)
  
  // Boost for high quality models
  if (model.average_quality) {
    score += model.average_quality * 10
  }
  
  return score
}

export async function searchModels(filters: SearchFilters = {}) {
  const supabase = await createClient()
  
  // Build base query with tags join
  let query = supabase
    .from('models')
    .select(`
      *,
      category:categories(*),
      tags:model_tags(
        tag:tags(*)
      )
    `)

  // Text search (only if query is provided)
  let searchQuery = filters.query || ''
  const originalSearchQuery = searchQuery // Keep original for relevance scoring
  
  // Only add PLA to query if there's no specific search query
  // This allows specific searches like "Citroen BX" to work properly
  if (filters.pla_compatible !== false && !searchQuery) {
    searchQuery = 'PLA'
  }
  
  if (searchQuery) {
    // Split query into words for better matching
    const searchWords = searchQuery.trim().split(/\s+/).filter(w => w.length > 0)
    
    // Build search conditions - prioritize exact phrase, then individual words
    const conditions: string[] = []
    
    // Exact phrase match (highest priority)
    conditions.push(`name.ilike.%${searchQuery}%`)
    conditions.push(`description.ilike.%${searchQuery}%`)
    
    // Individual word matches (for multi-word queries)
    searchWords.forEach(word => {
      if (word.length > 1) { // Search for words longer than 1 character
        conditions.push(`name.ilike.%${word}%`)
        conditions.push(`description.ilike.%${word}%`)
      }
    })
    
    // Combine with OR - any of these conditions should match
    if (conditions.length > 0) {
      query = query.or(conditions.join(','))
    }
  }

  // Category filter
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }

  // Tags filter
  if (filters.tag_ids && filters.tag_ids.length > 0) {
    query = query.contains('tags', filters.tag_ids)
  }

  // Price filter
  if (filters.is_free !== undefined) {
    query = query.eq('is_free', filters.is_free)
  }

  // License filter
  if (filters.license_type) {
    query = query.eq('license_type', filters.license_type)
  }

  // For relevance sorting, we'll fetch more results and sort client-side
  // For other sorts, use database ordering
  const shouldUseRelevanceSort = filters.sort_by === 'relevance' || !filters.sort_by
  // Fetch more results to account for tag-based filtering and better relevance
  const fetchLimit = shouldUseRelevanceSort ? (filters.limit || 20) * 10 : (filters.limit || 20) * 3

  // Pagination - fetch more for relevance sorting
  const page = filters.page || 1
  const limit = filters.limit || 20
  const from = shouldUseRelevanceSort ? 0 : (page - 1) * limit
  const to = shouldUseRelevanceSort ? fetchLimit - 1 : from + limit - 1

  // Apply database sorting for non-relevance sorts
  if (!shouldUseRelevanceSort) {
    switch (filters.sort_by) {
      case 'popularity':
        query = query.order('download_count', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
    }
  } else {
    // For relevance, order by download count as fallback
    query = query.order('download_count', { ascending: false })
  }

  query = query.range(from, to)

  const { data, error } = await query

  if (error) {
    throw error
  }

  // Transform data to include average scores
  const modelsWithScores = await Promise.all(
    (data || []).map(async (model) => {
      // Get average review scores
      const { data: reviews } = await supabase
        .from('reviews')
        .select('quality_score, printability_score, design_score')
        .eq('model_id', model.id)

      const avgQuality =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.quality_score, 0) / reviews.length
          : null
      const avgPrintability =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.printability_score, 0) / reviews.length
          : null
      const avgDesign =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.design_score, 0) / reviews.length
          : null

      // Apply score filters
      if (filters.min_quality && avgQuality && avgQuality < filters.min_quality) {
        return null
      }
      if (
        filters.min_printability &&
        avgPrintability &&
        avgPrintability < filters.min_printability
      ) {
        return null
      }
      if (filters.min_design && avgDesign && avgDesign < filters.min_design) {
        return null
      }

      return {
        ...model,
        tags: model.tags?.map((mt: any) => mt.tag),
        average_quality: avgQuality,
        average_printability: avgPrintability,
        average_design: avgDesign,
      }
    })
  )

  // Filter for PLA-compatible models
  let filteredModels = modelsWithScores.filter((m) => m !== null) as Model[]
  
  if (filters.pla_compatible !== false) {
    const hasSpecificQuery = originalSearchQuery && originalSearchQuery.trim().length > 0
    
    filteredModels = filteredModels.filter((m) => {
      const nameLower = (m.name || '').toLowerCase()
      const descLower = (m.description || '').toLowerCase()
      const tagsLower = (m.tags || []).map((t: any) => (t.name || '').toLowerCase()).join(' ')
      const allText = `${nameLower} ${descLower} ${tagsLower}`.toLowerCase()
      
      // If there's a specific query and the model matches it, be more lenient with PLA filter
      if (hasSpecificQuery) {
        const queryLower = originalSearchQuery.toLowerCase()
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
  
  // Apply relevance sorting if needed
  if (shouldUseRelevanceSort && originalSearchQuery) {
    // Calculate relevance scores and sort
    filteredModels = filteredModels
      .map(model => ({
        model,
        score: calculateRelevanceScore(model, originalSearchQuery)
      }))
      .filter(item => item.score > 0) // Only include models that match
      .sort((a, b) => b.score - a.score)
      .map(item => item.model)
  }
  
  // Apply pagination for relevance sort (after sorting)
  if (shouldUseRelevanceSort) {
    const startIndex = (page - 1) * limit
    filteredModels = filteredModels.slice(startIndex, startIndex + limit)
  }
  
  return filteredModels
}
