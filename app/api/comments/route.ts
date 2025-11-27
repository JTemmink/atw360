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

    // Get top-level comments
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*, user:users(email)')
      .eq('model_id', model_id)
      .is('parent_id', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      (comments || []).map(async (comment) => {
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

    return NextResponse.json({ comments: commentsWithReplies })
  } catch (error) {
    console.error('Comments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { model_id, parent_id, content } = await request.json()

    if (!model_id || !content) {
      return NextResponse.json(
        { error: 'model_id and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        model_id,
        parent_id: parent_id || null,
        content,
      })
      .select('*, user:users(email)')
      .single()

    if (error) throw error

    return NextResponse.json({ comment: data })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const comment_id = searchParams.get('comment_id')

    if (!comment_id) {
      return NextResponse.json(
        { error: 'comment_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', comment_id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete comment error:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}




