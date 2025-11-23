import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const formData = await request.formData()

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category_id = formData.get('category_id') as string
    const tag_ids = formData.get('tag_ids') as string
    const file = formData.get('file') as File
    const thumbnail = formData.get('thumbnail') as File | null

    if (!name || !file) {
      return NextResponse.json(
        { error: 'Name and file are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['application/octet-stream', 'model/stl', 'model/obj']
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!['stl', 'obj', 'gltf', 'glb'].includes(fileExtension || '')) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: STL, OBJ, GLTF, GLB' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Upload file to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const { data: fileData, error: fileError } = await supabase.storage
      .from('models')
      .upload(fileName, file, {
        contentType: file.type || 'application/octet-stream',
      })

    if (fileError) throw fileError

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('models').getPublicUrl(fileName)

    // Upload thumbnail if provided
    let thumbnailUrl = null
    if (thumbnail) {
      const thumbExt = thumbnail.name.split('.').pop()
      const thumbName = `${user.id}/thumbnails/${Date.now()}.${thumbExt}`
      const { error: thumbError } = await supabase.storage
        .from('models')
        .upload(thumbName, thumbnail)

      if (!thumbError) {
        const {
          data: { publicUrl: thumbPublicUrl },
        } = supabase.storage.from('models').getPublicUrl(thumbName)
        thumbnailUrl = thumbPublicUrl
      }
    }

    // Create model record
    const { data: model, error: modelError } = await supabase
      .from('models')
      .insert({
        name,
        description: description || null,
        category_id: category_id || null,
        user_id: user.id,
        thumbnail_url: thumbnailUrl,
        is_free: true,
      })
      .select()
      .single()

    if (modelError) throw modelError

    // Create model file record
    const { error: fileRecordError } = await supabase.from('model_files').insert({
      model_id: model.id,
      file_url: publicUrl,
      file_type: fileExtension?.toUpperCase() || 'STL',
      file_size: file.size,
    })

    if (fileRecordError) throw fileRecordError

    // Add tags if provided
    if (tag_ids) {
      const tagIdArray = tag_ids.split(',').filter(Boolean)
      if (tagIdArray.length > 0) {
        const modelTags = tagIdArray.map((tagId) => ({
          model_id: model.id,
          tag_id: tagId,
        }))
        await supabase.from('model_tags').insert(modelTags)
      }
    }

    return NextResponse.json({ model })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload model' },
      { status: 500 }
    )
  }
}

