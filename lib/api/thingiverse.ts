export interface ThingiverseThing {
  id: number
  name: string
  description: string
  thumbnail: string
  preview_image: string
  public_url: string
  creator: {
    id: number
    name: string
    public_url: string
  }
  tags: Array<{
    name: string
    tag: string
  }>
  categories: Array<{
    id: number
    name: string
  }>
  license: string
  like_count: number
  download_count: number
  view_count: number
  added: string
  modified: string
  is_published: number
  is_wip: number
  default_image: {
    id: number
    name: string
    url: string
    sizes: Array<{
      type: string
      size: string
      url: string
    }>
  }
  files_url: string
}

interface ThingiverseSearchResponse {
  hits: ThingiverseThing[]
  total: number
}

export class ThingiverseAPI {
  private baseUrl = 'https://api.thingiverse.com'
  private token: string

  constructor(token?: string) {
    this.token = token || process.env.THINGIVERSE_API_TOKEN || ''
  }

  async searchThings(query: string, options: {
    category?: string
    tag?: string
    sort?: 'relevant' | 'popular' | 'newest' | 'makes'
    page?: number
    perPage?: number
  } = {}): Promise<ThingiverseSearchResponse> {
    const debugInfo: any = {
      query,
      tokenPresent: !!this.token,
      tokenLength: this.token?.length || 0,
      options,
      attempts: [],
    }

    console.log('[Thingiverse API] Starting search:', JSON.stringify(debugInfo, null, 2))

    const params = new URLSearchParams({
      page: (options.page || 1).toString(),
      per_page: (options.perPage || 20).toString(),
    })

    if (options.sort) {
      params.append('sort', options.sort)
    }

    if (options.category) {
      params.append('category', options.category)
    }

    if (options.tag) {
      params.append('tag', options.tag)
    }

    // Add token if available
    if (this.token) {
      params.append('access_token', this.token)
    }

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': '3D-Model-Search-Platform/1.0',
    }

    // Try different endpoint formats based on Thingiverse API documentation
    const endpoints = [
      {
        name: 'search endpoint',
        url: `${this.baseUrl}/search/${encodeURIComponent(query)}?${params.toString()}`,
      },
      {
        name: 'things endpoint with search param',
        url: `${this.baseUrl}/things?search=${encodeURIComponent(query)}&${params.toString()}`,
      },
      {
        name: 'things endpoint with q param',
        url: `${this.baseUrl}/things?q=${encodeURIComponent(query)}&${params.toString()}`,
      },
    ]

    for (const endpoint of endpoints) {
      const attempt: any = {
        name: endpoint.name,
        url: endpoint.url.replace(this.token || '', '[TOKEN_HIDDEN]'),
        status: null,
        statusText: null,
        responseBody: null,
        error: null,
      }

      try {
        console.log(`[Thingiverse API] Trying ${endpoint.name}: ${attempt.url}`)
        const response = await fetch(endpoint.url, { headers })
        
        attempt.status = response.status
        attempt.statusText = response.statusText
        attempt.headers = Object.fromEntries(response.headers.entries())

        const responseText = await response.text()
        attempt.responseBody = responseText.substring(0, 500) // First 500 chars for debugging

        if (response.ok) {
          try {
            const data = JSON.parse(responseText)
            console.log(`[Thingiverse API] Response structure:`, Object.keys(data))
            console.log(`[Thingiverse API] Response sample:`, JSON.stringify(data).substring(0, 200))
            
            // Handle different response formats
            let hits: ThingiverseThing[] = []
            let total = 0

            if (Array.isArray(data)) {
              hits = data
              total = data.length
              console.log(`[Thingiverse API] Found ${hits.length} results (array format)`)
            } else if (data.hits && Array.isArray(data.hits)) {
              hits = data.hits
              total = data.total || data.hits.length
              console.log(`[Thingiverse API] Found ${hits.length} results (hits format)`)
            } else if (data.results && Array.isArray(data.results)) {
              hits = data.results
              total = data.total || data.results.length
              console.log(`[Thingiverse API] Found ${hits.length} results (results format)`)
            } else if (data.things && Array.isArray(data.things)) {
              hits = data.things
              total = data.total || data.things.length
              console.log(`[Thingiverse API] Found ${hits.length} results (things format)`)
            } else {
              console.warn(`[Thingiverse API] Unknown response format:`, Object.keys(data))
              attempt.unknownFormat = true
              attempt.responseKeys = Object.keys(data)
            }

            if (hits.length > 0) {
              // Log first hit structure to see what fields are available
              if (hits[0]) {
                console.log(`[Thingiverse API] First hit structure:`, {
                  id: hits[0].id,
                  name: hits[0].name,
                  hasDownloadCount: 'download_count' in hits[0],
                  downloadCount: (hits[0] as any).download_count,
                  allKeys: Object.keys(hits[0]),
                  sampleData: JSON.stringify(hits[0]).substring(0, 300),
                })
              }
              
              attempt.success = true
              attempt.resultsCount = hits.length
              debugInfo.attempts.push(attempt)
              console.log(`[Thingiverse API] Success! Returning ${hits.length} results`)
              return { hits, total }
            } else {
              attempt.noResults = true
            }
          } catch (parseError: any) {
            attempt.parseError = parseError.message
            console.error(`[Thingiverse API] JSON parse error:`, parseError)
          }
        } else {
          attempt.failed = true
          console.error(`[Thingiverse API] HTTP ${response.status}: ${response.statusText}`)
          console.error(`[Thingiverse API] Response body:`, responseText.substring(0, 500))
        }
      } catch (error: any) {
        attempt.error = error.message
        attempt.stack = error.stack
        console.error(`[Thingiverse API] Fetch error for ${endpoint.name}:`, error)
      }

      debugInfo.attempts.push(attempt)
    }

    // If all attempts fail, log everything
    console.error(`[Thingiverse API] All attempts failed for query "${query}"`)
    console.error(`[Thingiverse API] Debug info:`, JSON.stringify(debugInfo, null, 2))
    
    return {
      hits: [],
      total: 0,
    }
  }

  async getThingDetails(thingId: number): Promise<ThingiverseThing> {
    const params = new URLSearchParams()
    if (this.token) {
      params.append('access_token', this.token)
    }
    
    const url = `${this.baseUrl}/things/${thingId}${params.toString() ? '?' + params.toString() : ''}`
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': '3D-Model-Search-Platform/1.0',
    }

    console.log(`[Thingiverse API] Fetching thing ${thingId} from: ${url.replace(this.token || '', '[TOKEN_HIDDEN]')}`)

    try {
      const response = await fetch(url, { headers })

      if (!response.ok) {
        let errorText = ''
        let errorData: any = null
        
        try {
          errorText = await response.text()
          if (errorText) {
            try {
              errorData = JSON.parse(errorText)
            } catch {
              // Not JSON, use as text
            }
          }
        } catch (textError) {
          errorText = response.statusText || 'Unknown error'
        }

        const errorInfo: any = {
          status: response.status,
          statusText: response.statusText,
          url: url.replace(this.token || '', '[TOKEN_HIDDEN]'),
        }

        if (errorData) {
          errorInfo.errorData = errorData
        } else if (errorText) {
          errorInfo.body = errorText.substring(0, 500)
        }

        console.error(`[Thingiverse API] Error fetching thing ${thingId}:`, errorInfo)
        
        // Handle specific error cases
        if (response.status === 404) {
          throw new Error(`Thing ${thingId} not found on Thingiverse`)
        } else if (response.status === 401 || response.status === 403) {
          throw new Error(`Thingiverse API authentication failed. Check your API token.`)
        } else if (response.status === 429) {
          throw new Error(`Thingiverse API rate limit exceeded. Please try again later.`)
        } else {
          throw new Error(`Thingiverse API error: ${response.status} ${response.statusText}`)
        }
      }

      const data = await response.json()
      console.log(`[Thingiverse API] Thing ${thingId} fetched successfully`)
      return data
    } catch (error: any) {
      // Re-throw if it's already our custom error
      if (error.message && error.message.includes('Thingiverse API')) {
        throw error
      }
      // Otherwise wrap it
      console.error(`[Thingiverse API] Unexpected error fetching thing ${thingId}:`, error)
      throw new Error(`Failed to fetch thing ${thingId}: ${error.message || 'Unknown error'}`)
    }
  }

  async getThingFiles(thingId: number): Promise<any[]> {
    const params = new URLSearchParams()
    if (this.token) {
      params.append('access_token', this.token)
    }
    
    const url = `${this.baseUrl}/things/${thingId}/files${params.toString() ? '?' + params.toString() : ''}`
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': '3D-Model-Search-Platform/1.0',
    }

    try {
      const response = await fetch(url, { headers })

      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
        } catch {
          errorText = response.statusText || 'Unknown error'
        }

        const errorInfo: any = {
          status: response.status,
          statusText: response.statusText,
          url: url.replace(this.token || '', '[TOKEN_HIDDEN]'),
        }

        if (errorText) {
          errorInfo.body = errorText.substring(0, 500)
        }

        console.error(`[Thingiverse API] Error fetching files for ${thingId}:`, errorInfo)
        
        if (response.status === 404) {
          // Files endpoint might not exist for some things, return empty array
          console.warn(`[Thingiverse API] Files not found for thing ${thingId}, returning empty array`)
          return []
        }
        
        throw new Error(`Thingiverse API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error: any) {
      if (error.message && error.message.includes('Thingiverse API')) {
        throw error
      }
      console.error(`[Thingiverse API] Unexpected error fetching files for ${thingId}:`, error)
      // Return empty array on error instead of throwing, so model detail page still works
      return []
    }
  }
}

export const thingiverseAPI = new ThingiverseAPI()

