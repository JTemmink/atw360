import { SearchFilters, Model } from '@/lib/types/models'
import { createClient } from '@/lib/supabase/server'

export async function searchModels(filters: SearchFilters = {}) {
  const supabase = await createClient()
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
  // If no query but filters are set, show all models matching the filters
  // Always add PLA to search to filter for PLA-compatible models
  let searchQuery = filters.query || ''
  if (searchQuery && !searchQuery.toLowerCase().includes('pla')) {
    searchQuery = `${searchQuery} PLA`
  } else if (!searchQuery) {
    // If no query, search for PLA-compatible models
    searchQuery = 'PLA'
  }
  
  if (searchQuery) {
    query = query.or(
      `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
    )
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

  // Sorting
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
    default:
      // Relevance - order by download count and created_at
      query = query.order('download_count', { ascending: false })
  }

  // Pagination
  const page = filters.page || 1
  const limit = filters.limit || 20
  const from = (page - 1) * limit
  const to = from + limit - 1

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

  // Filter for PLA-compatible models suitable for Bambu P1S/P2S
  const filteredModels = modelsWithScores.filter((m) => {
    if (!m) return false
    
    const nameLower = (m.name || '').toLowerCase()
    const descLower = (m.description || '').toLowerCase()
    const tagsLower = (m.tags || []).map((t: any) => (t.name || '').toLowerCase()).join(' ')
    const allText = `${nameLower} ${descLower} ${tagsLower}`.toLowerCase()
    
    // Check for PLA compatibility
    const hasPLA = allText.includes('pla') || 
                  allText.includes('polylactic acid') ||
                  tagsLower.includes('pla')
    
    // Check for Bambu P1S/P2S compatibility or general FDM compatibility
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
    
    // If model explicitly mentions incompatible materials, exclude it
    const hasIncompatibleMaterial = 
      (allText.includes('abs') && !allText.includes('pla')) ||
      (allText.includes('petg') && !allText.includes('pla')) ||
      (allText.includes('tpu') && !allText.includes('pla')) ||
      (allText.includes('resin') && !allText.includes('pla')) ||
      (allText.includes('sla') && !allText.includes('pla')) ||
      (allText.includes('dlp') && !allText.includes('pla')) ||
      (allText.includes('sls') && !allText.includes('pla'))
    
    // Include if: has PLA AND (has Bambu compatibility OR no incompatible materials)
    return hasPLA && (hasBambuCompatibility || !hasIncompatibleMaterial)
  }) as Model[]
  
  return filteredModels
}

