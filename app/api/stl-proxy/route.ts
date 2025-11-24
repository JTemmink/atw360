import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
  }

  try {
    // Handle Thingiverse download:ID format
    let actualUrl = url
    if (url.includes('thingiverse.com/download:')) {
      // Extract file ID from download:ID format
      const fileIdMatch = url.match(/download:(\d+)/)
      if (fileIdMatch) {
        const fileId = fileIdMatch[1]
        // Use Thingiverse API to get direct download URL
        const token = process.env.THINGIVERSE_API_TOKEN
        const apiUrl = `https://api.thingiverse.com/files/${fileId}${token ? `?access_token=${token}` : ''}`
        
        try {
          const fileResponse = await fetch(apiUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': '3D-Model-Search-Platform/1.0',
            },
          })
          
          if (fileResponse.ok) {
            const fileData = await fileResponse.json()
            console.log(`[STL Proxy] File data from API:`, {
              id: fileData.id,
              name: fileData.name,
              hasDirectUrl: !!fileData.direct_url,
              hasPublicUrl: !!fileData.public_url,
              hasUrl: !!fileData.url,
            })
            
            // Thingiverse API returns direct_url or public_url
            actualUrl = fileData.direct_url || fileData.public_url || fileData.url
            
            if (!actualUrl) {
              // If no URL in response, try to fetch the file directly from API
              actualUrl = `https://api.thingiverse.com/files/${fileId}/download${token ? `?access_token=${token}` : ''}`
            }
            
            console.log(`[STL Proxy] Converted Thingiverse download URL to: ${actualUrl.replace(token || '', '[TOKEN_HIDDEN]')}`)
          } else {
            // Fallback: try direct download endpoint
            const token = process.env.THINGIVERSE_API_TOKEN
            actualUrl = `https://api.thingiverse.com/files/${fileId}/download${token ? `?access_token=${token}` : ''}`
            console.log(`[STL Proxy] API returned ${fileResponse.status}, trying direct download endpoint`)
          }
        } catch (apiError: any) {
          console.warn('[STL Proxy] Failed to get file info from API:', apiError.message)
          // Fallback: try direct download endpoint
          const token = process.env.THINGIVERSE_API_TOKEN
          actualUrl = `https://api.thingiverse.com/files/${fileId}/download${token ? `?access_token=${token}` : ''}`
        }
      }
    }
    
    // Validate URL
    let urlObj: URL
    try {
      urlObj = new URL(actualUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }
    
    // Only allow certain domains for security
    const allowedDomains = [
      'thingiverse.com',
      'cdn.thingiverse.com',
      'www.thingiverse.com',
      'api.thingiverse.com',
      'supabase.co',
      'storage.googleapis.com',
    ]
    
    const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain))
    
    if (!isAllowed) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
    }

    // Fetch the STL file
    const token = process.env.THINGIVERSE_API_TOKEN
    const headers: HeadersInit = {
      'User-Agent': '3D-Model-Search-Platform/1.0',
    }
    
    // Add token if it's a Thingiverse API URL
    if (urlObj.hostname.includes('thingiverse.com') && token) {
      urlObj.searchParams.set('access_token', token)
      actualUrl = urlObj.toString()
    }
    
    console.log(`[STL Proxy] Fetching file from: ${actualUrl.replace(process.env.THINGIVERSE_API_TOKEN || '', '[TOKEN_HIDDEN]')}`)
    
    const response = await fetch(actualUrl, { headers })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      console.error(`[STL Proxy] Failed to fetch file:`, {
        status: response.status,
        statusText: response.statusText,
        url: actualUrl.replace(process.env.THINGIVERSE_API_TOKEN || '', '[TOKEN_HIDDEN]'),
        error: errorText.substring(0, 200),
      })
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const blob = await response.blob()
    
    if (blob.size === 0) {
      console.error('[STL Proxy] File is empty')
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      )
    }
    
    const arrayBuffer = await blob.arrayBuffer()
    console.log(`[STL Proxy] Successfully fetched file, size: ${arrayBuffer.byteLength} bytes`)

    // Return the file with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error('[STL Proxy] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to proxy STL file' },
      { status: 500 }
    )
  }
}

