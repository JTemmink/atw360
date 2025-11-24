import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils/auth'
import FavoritesList from '@/components/favorites/FavoritesList'
import { createClient } from '@/lib/supabase/server'

export default async function FavoritesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  const { data: favorites } = await supabase
    .from('favorites')
    .select(`
      *,
      model:models(
        *,
        category:categories(*),
        tags:model_tags(
          tag:tags(*)
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Mijn Favorieten</h1>
        <FavoritesList favorites={favorites || []} />
      </div>
    </div>
  )
}



