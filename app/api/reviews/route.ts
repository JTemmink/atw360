import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const model_id = searchParams.get('model_id')

    if (!model_id) {
      return NextResponse.json(
        { error: 'model_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('reviews')
      .select('*, user:users(email)')
      .eq('model_id', model_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate averages
    const avgQuality =
      data && data.length > 0
        ? data.reduce((sum, r) => sum + r.quality_score, 0) / data.length
        : null
    const avgPrintability =
      data && data.length > 0
        ? data.reduce((sum, r) => sum + r.printability_score, 0) / data.length
        : null
    const avgDesign =
      data && data.length > 0
        ? data.reduce((sum, r) => sum + r.design_score, 0) / data.length
        : null

    return NextResponse.json({
      reviews: data,
      averages: {
        quality: avgQuality,
        printability: avgPrintability,
        design: avgDesign,
      },
    })
  } catch (error) {
    console.error('Reviews error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { model_id, quality_score, printability_score, design_score, comment } =
      await request.json()

    if (!model_id || !quality_score || !printability_score || !design_score) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if review already exists
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('model_id', model_id)
      .single()

    let data, error
    if (existing) {
      // Update existing review
      const result = await supabase
        .from('reviews')
        .update({
          quality_score,
          printability_score,
          design_score,
          comment: comment || null,
        })
        .eq('id', existing.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Create new review
      const result = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          model_id,
          quality_score,
          printability_score,
          design_score,
          comment: comment || null,
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) throw error

    return NextResponse.json({ review: data })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create review error:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const review_id = searchParams.get('review_id')

    if (!review_id) {
      return NextResponse.json(
        { error: 'review_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', review_id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete review error:', error)
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}




