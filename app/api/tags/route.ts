import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')

    if (error) throw error

    return NextResponse.json({ tags: data })
  } catch (error) {
    console.error('Tags error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}



