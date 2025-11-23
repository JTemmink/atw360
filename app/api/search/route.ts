import { NextRequest, NextResponse } from 'next/server'
import { searchModels } from '@/lib/utils/search'
import { SearchFilters } from '@/lib/types/models'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const filters: SearchFilters = {
      query: searchParams.get('q') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      tag_ids: searchParams.get('tag_ids')?.split(',').filter(Boolean),
      min_quality: searchParams.get('min_quality')
        ? parseInt(searchParams.get('min_quality')!)
        : undefined,
      min_printability: searchParams.get('min_printability')
        ? parseInt(searchParams.get('min_printability')!)
        : undefined,
      min_design: searchParams.get('min_design')
        ? parseInt(searchParams.get('min_design')!)
        : undefined,
      is_free:
        searchParams.get('is_free') === 'true'
          ? true
          : searchParams.get('is_free') === 'false'
            ? false
            : undefined,
      license_type: searchParams.get('license_type') || undefined,
      file_type: searchParams.get('file_type') || undefined,
      sort_by: (searchParams.get('sort_by') as SearchFilters['sort_by']) || 'relevance',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    }

    const models = await searchModels(filters)
    
    // Get total count for pagination (approximate for now)
    // TODO: Implement proper count query
    const total = models.length >= (filters.limit || 20) 
      ? (filters.page || 1) * (filters.limit || 20) + 20 // Estimate
      : models.length

    return NextResponse.json({ 
      models,
      total,
      page: filters.page || 1,
      pageSize: filters.limit || 20,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search models' },
      { status: 500 }
    )
  }
}

