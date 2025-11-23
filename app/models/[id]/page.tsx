import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ModelDetail from '@/components/models/ModelDetail'
import { thingiverseAPI } from '@/lib/api/thingiverse'

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Check if this is an external model (Thingiverse)
  const isExternalModel = id.startsWith('thingiverse_')
  
  let model: any = null
  let modelFiles: any[] = []

  if (isExternalModel) {
    // Handle external Thingiverse model
    try {
      const thingIdStr = id.replace('thingiverse_', '')
      const thingId = parseInt(thingIdStr)
      
      if (isNaN(thingId)) {
        console.error(`[Model Detail] Invalid Thingiverse ID: ${id}`)
        notFound()
      }
      
      console.log(`[Model Detail] Fetching Thingiverse model ${thingId}...`)
      const thing = await thingiverseAPI.getThingDetails(thingId)
      console.log(`[Model Detail] Thingiverse model fetched:`, {
        id: thing.id,
        name: thing.name,
        hasDownloadCount: 'download_count' in thing,
      })
      
      const files = await thingiverseAPI.getThingFiles(thingId).catch((error) => {
        console.warn(`[Model Detail] Failed to fetch files for ${thingId}:`, error)
        return []
      })

      // Map Thingiverse thing to our Model format
      const thumbnail = thing.default_image?.sizes?.find((s: any) => 
        s.type === 'large' || s.type === 'feature'
      )?.url || thing.default_image?.url || thing.thumbnail || thing.preview_image || null

      model = {
        id: `thingiverse_${thing.id}`,
        name: thing.name,
        description: thing.description || null,
        category_id: null,
        user_id: '',
        thumbnail_url: thumbnail,
        created_at: thing.added || new Date().toISOString(),
        updated_at: thing.modified || thing.added || new Date().toISOString(),
        download_count: thing.download_count || 0,
        license_type: thing.license || 'Creative Commons',
        is_free: true,
        is_external: true,
        external_url: thing.public_url,
        category: thing.categories?.[0] ? { name: thing.categories[0].name } : null,
        tags: thing.tags?.map((tag: any) => ({
          id: `thingiverse_tag_${tag.tag}`,
          name: tag.name,
          slug: tag.tag,
        })),
      }

      // Map files
      modelFiles = files.map((file: any) => ({
        id: `thingiverse_file_${file.id}`,
        model_id: model.id,
        file_url: file.public_url || file.download_url || file.url,
        file_type: file.name?.split('.').pop()?.toUpperCase() || 'STL',
        file_size: file.size || 0,
      }))
    } catch (error: any) {
      console.error('[Model Detail] Error fetching Thingiverse model:', {
        id,
        thingId: id.replace('thingiverse_', ''),
        error: error.message,
        stack: error.stack,
      })
      notFound()
    }
  } else {
    // Handle local model from database
    const { data, error } = await supabase
      .from('models')
      .select(`
        *,
        category:categories(*),
        tags:model_tags(
          tag:tags(*)
        ),
        files:model_files(*)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      notFound()
    }

    model = data
    modelFiles = model.files || []
  }

  // Get reviews with averages (only for local models)
  const { data: reviews } = isExternalModel 
    ? { data: null }
    : await supabase
        .from('reviews')
        .select('*, user:users(email)')
        .eq('model_id', id)
        .order('created_at', { ascending: false })

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

  // Get comments with replies (only for local models)
  let comments: any[] = []
  if (!isExternalModel) {
    const { data: topComments } = await supabase
      .from('comments')
      .select('*, user:users(email)')
      .eq('model_id', id)
      .is('parent_id', null)
      .order('created_at', { ascending: false })

    comments = await Promise.all(
      (topComments || []).map(async (comment) => {
        const { data: replies } = await supabase
          .from('comments')
          .select('*, user:users(email)')
          .eq('parent_id', comment.id)
          .order('created_at', { ascending: true })

        return {
          ...comment,
          replies: replies || [],
        }
      })
    )
  }

  const modelWithData = {
    ...model,
    tags: model.tags?.map((mt: any) => mt.tag || mt),
    average_quality: avgQuality,
    average_printability: avgPrintability,
    average_design: avgDesign,
    reviews: reviews || [],
    comments: comments || [],
    files: modelFiles,
    is_external: isExternalModel,
  }

  return <ModelDetail model={modelWithData} />
}

