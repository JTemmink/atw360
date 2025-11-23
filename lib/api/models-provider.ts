import { Model } from '@/lib/types/models'
import { thingiverseAPI, ThingiverseThing } from './thingiverse'

export interface ModelProvider {
  name: string
  search(query: string, options?: any): Promise<Model[]>
}

export class ThingiverseProvider implements ModelProvider {
  name = 'Thingiverse'

  async search(query: string, options: {
    categories?: string[]
    tags?: string[]
    page?: number
    pageSize?: number
    sortBy?: 'relevant' | 'popular' | 'newest' | 'makes'
  } = {}): Promise<Model[]> {
    console.log(`[ThingiverseProvider] Search called:`, { query, options })
    
    try {
      // Map our sort options to Thingiverse sort options
      const thingiverseSort = options.sortBy === 'popular' 
        ? 'popular' 
        : options.sortBy === 'newest'
        ? 'newest'
        : 'relevant'

      const response = await thingiverseAPI.searchThings(query, {
        page: options.page,
        perPage: options.pageSize,
        tag: options.tags?.[0], // Thingiverse supports single tag
        sort: thingiverseSort,
      })
      
      console.log(`[ThingiverseProvider] API response:`, {
        hitsCount: response.hits.length,
        total: response.total,
        firstHit: response.hits[0] ? {
          id: response.hits[0].id,
          name: response.hits[0].name,
          download_count: response.hits[0].download_count,
          hasDownloadCount: 'download_count' in (response.hits[0] || {}),
          allKeys: Object.keys(response.hits[0] || {}),
        } : null,
      })
      
      if (response.hits.length === 0) {
        console.warn(`[ThingiverseProvider] No results for "${query}"`)
        console.warn(`[ThingiverseProvider] Token present: ${!!process.env.THINGIVERSE_API_TOKEN}`)
        return []
      }
      
      // Thingiverse search API might not return download_count in search results
      // Check if we need to fetch details
      const needsDetails = response.hits.some((hit: any) => 
        hit.download_count === undefined || hit.download_count === null
      )
      
      if (needsDetails) {
        console.log(`[ThingiverseProvider] Some results missing download_count, fetching details...`)
        
        // Fetch details only for items missing download_count (with rate limiting)
        const hitsWithDetails = await Promise.all(
          response.hits.map(async (hit: any, index: number) => {
            // If search result already has download_count, use it
            if (hit.download_count !== undefined && hit.download_count !== null) {
              return hit
            }
            
            // Add small delay to avoid rate limiting (100ms between requests)
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
            
            // Fetch details for missing download_count
            try {
              const details = await thingiverseAPI.getThingDetails(hit.id)
              return { 
                ...hit, 
                download_count: details.download_count || 0,
              }
            } catch (error) {
              console.warn(`[ThingiverseProvider] Failed to fetch details for ${hit.id}:`, error)
              return { ...hit, download_count: 0 }
            }
          })
        )
        
        response.hits = hitsWithDetails
      }
      
      const models = response.hits.map(this.mapThingiverseToModel)
      console.log(`[ThingiverseProvider] Mapped ${models.length} models`)
      
      return models
    } catch (error: any) {
      console.error('[ThingiverseProvider] Search error:', error)
      console.error('[ThingiverseProvider] Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3),
      })
      return []
    }
  }

  private mapThingiverseToModel(thing: ThingiverseThing): Model {
    // Get highest quality thumbnail available
    let thumbnail: string | null = null
    
    if (thing.default_image?.sizes && Array.isArray(thing.default_image.sizes)) {
      // Try to find the largest/highest quality image
      // Thingiverse sizes: display, small, medium, large, feature
      const sizePriority = ['large', 'feature', 'medium', 'display', 'small', 'preview']
      
      for (const sizeType of sizePriority) {
        const size = thing.default_image.sizes.find((s: any) => 
          s.type === sizeType || s.size === sizeType
        )
        if (size?.url) {
          thumbnail = size.url
          break
        }
      }
      
      // If no specific size found, get the largest one
      if (!thumbnail && thing.default_image.sizes.length > 0) {
        const sortedSizes = [...thing.default_image.sizes].sort((a: any, b: any) => {
          // Sort by size if available, or by type priority
          const aSize = parseInt(a.size || '0')
          const bSize = parseInt(b.size || '0')
          return bSize - aSize
        })
        thumbnail = sortedSizes[0]?.url || null
      }
    }
    
    // Fallback to other image sources
    if (!thumbnail) {
      thumbnail = thing.default_image?.url 
        || thing.preview_image 
        || thing.thumbnail 
        || null
    }
    
    // If we have a thumbnail URL, try to get higher quality version
    // Thingiverse image URLs can often be modified for higher quality
    if (thumbnail) {
      try {
        // Handle both absolute and relative URLs
        let urlObj: URL
        if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
          urlObj = new URL(thumbnail)
        } else {
          // Relative URL, make it absolute
          urlObj = new URL(thumbnail, 'https://www.thingiverse.com')
        }
        
        const pathParts = urlObj.pathname.split('/').filter(Boolean)
        
        // Replace size indicators in path with 'large' for better quality
        const sizeIndicators = ['small', 'medium', 'thumb', 'thumbnail', 'display']
        for (const size of sizeIndicators) {
          const index = pathParts.indexOf(size)
          if (index !== -1) {
            pathParts[index] = 'large'
            break
          }
        }
        
        // Reconstruct URL with large size
        urlObj.pathname = '/' + pathParts.join('/')
        
        // Remove size/width/height parameters
        urlObj.searchParams.delete('size')
        urlObj.searchParams.delete('width')
        urlObj.searchParams.delete('height')
        
        thumbnail = urlObj.toString()
      } catch (error) {
        // If URL parsing fails, use simple string replacements
        thumbnail = thumbnail
          .replace(/\/small\//, '/large/')
          .replace(/\/medium\//, '/large/')
          .replace(/\/display\//, '/large/')
          .replace(/\/thumb\//, '/large/')
          .replace(/\/thumbnails\//, '/images/')
          .replace(/[?&]size=\w+/, '')
          .replace(/[?&]width=\d+/, '')
          .replace(/[?&]height=\d+/, '')
      }
    }

    // Thingiverse API might use different field names in search vs detail
    // Try multiple possible field names for download_count
    const downloadCount = (thing as any).download_count 
      || (thing as any).downloads 
      || (thing as any).download_count_total
      || (thing as any).downloads_count
      || 0

    // Log only if download_count is missing to reduce noise
    if (downloadCount === 0 && thing.download_count === undefined) {
      console.log(`[ThingiverseProvider] Missing download_count for ${thing.id}:`, {
        name: thing.name,
        allFields: Object.keys(thing),
      })
    }

    return {
      id: `thingiverse_${thing.id}`,
      name: thing.name,
      description: thing.description || null,
      category_id: null, // Will be mapped later if needed
      user_id: '', // External models don't have our user_id
      thumbnail_url: thumbnail,
      created_at: thing.added || new Date().toISOString(),
      updated_at: thing.modified || thing.added || new Date().toISOString(),
      download_count: downloadCount,
      license_type: thing.license || 'Creative Commons',
      is_free: true, // Thingiverse models are typically free
      // Store external metadata
      external_url: thing.public_url, // Store Thingiverse URL
      tags: thing.tags?.map((tag) => ({
        id: `thingiverse_tag_${tag.tag}`,
        name: tag.name,
        slug: tag.tag,
        created_at: new Date().toISOString(),
      })),
    } as Model & { external_url?: string }
  }
}

// Factory to get provider
export function getModelProvider(providerName: string = 'thingiverse'): ModelProvider {
  switch (providerName.toLowerCase()) {
    case 'thingiverse':
      return new ThingiverseProvider()
    default:
      return new ThingiverseProvider()
  }
}

