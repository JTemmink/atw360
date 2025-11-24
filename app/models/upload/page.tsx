import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'
import ModelUpload from '@/components/models/ModelUpload'
import { createClient } from '@/lib/supabase/server'

export default async function UploadPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Upload Model</h1>
        <ModelUpload
          categories={categories || []}
          tags={tags || []}
        />
      </div>
    </div>
  )
}



