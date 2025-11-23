import { NextRequest, NextResponse } from 'next/server'
import { enhanceSearchQuery } from '@/lib/ai/openai'
import { searchModels } from '@/lib/utils/search'
import { SearchFilters } from '@/lib/types/models'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Use AI to enhance the search query
    const enhanced = await enhanceSearchQuery(query)

    // Build filters from AI suggestions
    const filters: SearchFilters = {
      query: enhanced.keywords.join(' '),
      category_id: enhanced.suggestedFilters.categories?.[0],
      tag_ids: enhanced.suggestedFilters.tags,
    }

    // Perform the search
    const models = await searchModels(filters)

    return NextResponse.json({
      models,
      suggestions: {
        keywords: enhanced.keywords,
        filters: enhanced.suggestedFilters,
      },
    })
  } catch (error) {
    console.error('AI search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform AI search' },
      { status: 500 }
    )
  }
}

