import { NextRequest, NextResponse } from 'next/server'
import { getModelProvider } from '@/lib/api/models-provider'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const debug: any = {
    timestamp: new Date().toISOString(),
    query: null,
    provider: null,
    tokenPresent: !!process.env.THINGIVERSE_API_TOKEN,
    tokenLength: process.env.THINGIVERSE_API_TOKEN?.length || 0,
    error: null,
    modelsCount: 0,
    duration: 0,
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const provider = searchParams.get('provider') || 'thingiverse'
    const debugMode = searchParams.get('debug') === 'true'

    debug.query = query
    debug.provider = provider

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required', debug },
        { status: 400 }
      )
    }

    console.log(`[External API] Search request:`, { query, provider, debugMode })

    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const sortBy = searchParams.get('sort_by') || 'relevant'

    const modelProvider = getModelProvider(provider)
    const models = await modelProvider.search(query, {
      page,
      pageSize,
      categories: searchParams.get('categories')?.split(',').filter(Boolean),
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      sortBy: sortBy as any,
    })

    debug.modelsCount = models.length
    debug.duration = Date.now() - startTime

    console.log(`[External API] Search completed:`, {
      query,
      provider,
      results: models.length,
      duration: `${debug.duration}ms`,
    })

    // Estimate total (we don't have exact total from external APIs)
    // If we got a full page, assume there are more results
    const estimatedTotal = models.length >= pageSize ? pageSize * 10 : models.length

    const response: any = {
      models,
      provider: modelProvider.name,
      total: estimatedTotal,
      page,
      pageSize,
    }

    if (debugMode) {
      response.debug = debug
    }

    return NextResponse.json(response)
  } catch (error: any) {
    debug.error = error.message
    debug.stack = error.stack
    debug.duration = Date.now() - startTime

    console.error('[External API] Search error:', error)
    console.error('[External API] Debug info:', debug)

    return NextResponse.json(
      {
        error: 'Failed to search external models',
        message: error.message,
        debug: debugMode ? debug : undefined,
      },
      { status: 500 }
    )
  }
}

