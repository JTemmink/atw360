'use client'

import { Model } from '@/lib/types/models'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Favorite {
  id: string
  model_id: string
  created_at: string
  model: Model
}

interface FavoritesListProps {
  favorites: Favorite[]
}

export default function FavoritesList({ favorites: initialFavorites }: FavoritesListProps) {
  const [favorites, setFavorites] = useState(initialFavorites)
  const supabase = createClient()

  const removeFavorite = async (modelId: string) => {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('model_id', modelId)

    if (!error) {
      setFavorites(favorites.filter((f) => f.model_id !== modelId))
    }
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Je hebt nog geen favorieten</p>
        <Link
          href="/search"
          className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
        >
          Zoek modellen
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {favorites.map((favorite) => (
        <div
          key={favorite.id}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
        >
          <Link href={`/models/${favorite.model_id}`}>
            {favorite.model.thumbnail_url ? (
              <img
                src={favorite.model.thumbnail_url}
                alt={favorite.model.name}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">Geen afbeelding</span>
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                {favorite.model.name}
              </h3>
              {favorite.model.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {favorite.model.description}
                </p>
              )}
            </div>
          </Link>
          <div className="px-4 pb-4">
            <button
              onClick={() => removeFavorite(favorite.model_id)}
              className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
            >
              Verwijder uit favorieten
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

