import { NextResponse } from 'next/server'
import { thingiverseAPI } from '@/lib/api/thingiverse'

// Test endpoint om Thingiverse API te testen
export async function GET() {
  const debug: any = {
    timestamp: new Date().toISOString(),
    tokenPresent: !!process.env.THINGIVERSE_API_TOKEN,
    tokenLength: process.env.THINGIVERSE_API_TOKEN?.length || 0,
    tokenPreview: process.env.THINGIVERSE_API_TOKEN 
      ? `${process.env.THINGIVERSE_API_TOKEN.substring(0, 10)}...${process.env.THINGIVERSE_API_TOKEN.substring(process.env.THINGIVERSE_API_TOKEN.length - 5)}`
      : 'NOT SET',
  }

  try {
    const testQuery = 'vase'
    console.log('[Thingiverse Test] Starting test with query:', testQuery)
    console.log('[Thingiverse Test] Token info:', {
      present: debug.tokenPresent,
      length: debug.tokenLength,
    })
    
    const startTime = Date.now()
    const response = await thingiverseAPI.searchThings(testQuery, {
      page: 1,
      perPage: 5,
    })
    const duration = Date.now() - startTime

    debug.duration = `${duration}ms`
    debug.results = response.hits.length
    debug.total = response.total

    if (response.hits.length > 0) {
      debug.sample = response.hits.slice(0, 2).map((hit: any) => ({
        id: hit.id,
        name: hit.name,
        hasThumbnail: !!(hit.thumbnail || hit.preview_image || hit.default_image),
      }))
    }

    return NextResponse.json({
      success: response.hits.length > 0,
      query: testQuery,
      results: response.hits.length,
      total: response.total,
      sample: response.hits.slice(0, 2).map((hit: any) => ({
        id: hit.id,
        name: hit.name,
        thumbnail: hit.thumbnail || hit.preview_image || hit.default_image?.url,
        description: hit.description?.substring(0, 100),
      })),
      debug,
      message: response.hits.length === 0 
        ? 'No results found. Check console logs for detailed error information. Make sure THINGIVERSE_API_TOKEN is correctly set in .env.local and restart the dev server.'
        : 'API is working correctly!',
    })
  } catch (error: any) {
    debug.error = error.message
    debug.stack = error.stack?.split('\n').slice(0, 5)

    console.error('[Thingiverse Test] Error:', error)

    return NextResponse.json({
      success: false,
      error: error.message,
      debug,
      message: 'Thingiverse API test failed. Check console for detailed logs.',
    }, { status: 500 })
  }
}

