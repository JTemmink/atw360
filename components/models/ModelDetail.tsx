'use client'

import { Model, Review, Comment } from '@/lib/types/models'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReviewForm from '@/components/reviews/ReviewForm'
import ReviewList from '@/components/reviews/ReviewList'
import { Review } from '@/lib/types/models'
import CommentForm from '@/components/comments/CommentForm'
import CommentList from '@/components/comments/CommentList'
import { Comment } from '@/lib/types/models'

interface ModelDetailProps {
  model: Model & {
    reviews?: (Review & { user?: { email: string } })[]
    comments?: Comment[]
    files?: any[]
  }
}

export default function ModelDetail({ model }: ModelDetailProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        checkFavorite(user.id)
      }
    })
  }, [])

  const isExternal = (model as any).is_external

  const checkFavorite = async (userId: string) => {
    if (isExternal) return // External models can't be favorited in our DB
    
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('model_id', model.id)
      .single()

    setIsFavorite(!!data)
  }

  const toggleFavorite = async () => {
    if (isExternal) {
      // For external models, we could store in localStorage or show a message
      alert('Externe modellen kunnen niet worden opgeslagen als favoriet. Bezoek de Thingiverse pagina om het daar op te slaan.')
      return
    }

    if (!user) {
      window.location.href = '/login'
      return
    }

    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('model_id', model.id)
      setIsFavorite(false)
    } else {
      await supabase.from('favorites').insert({
        user_id: user.id,
        model_id: model.id,
      })
      setIsFavorite(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{model.name}</h1>
                {model.description && (
                  <p className="text-gray-600 mb-4">{model.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  {model.category && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {model.category.name}
                    </span>
                  )}
                  {model.tags?.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
              {!isExternal && (
                <button
                  onClick={toggleFavorite}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isFavorite
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isFavorite ? '❤️ Verwijder uit favorieten' : '🤍 Voeg toe aan favorieten'}
                </button>
              )}
              {isExternal && (model as any).external_url && (
                <a
                  href={(model as any).external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Open op Thingiverse →
                </a>
              )}
            </div>
          </div>

          {/* Image */}
          {model.thumbnail_url && (
            <div className="w-full h-96 bg-gray-200">
              <img
                src={model.thumbnail_url}
                alt={model.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Stats */}
          <div className="p-6 border-b grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Downloads</div>
              <div className="text-2xl font-bold">{model.download_count}</div>
            </div>
            {model.average_quality && (
              <div>
                <div className="text-sm text-gray-600">Kwaliteit</div>
                <div className="text-2xl font-bold">
                  ⭐ {model.average_quality.toFixed(1)}
                </div>
              </div>
            )}
            {model.average_printability && (
              <div>
                <div className="text-sm text-gray-600">Printbaarheid</div>
                <div className="text-2xl font-bold">
                  ⭐ {model.average_printability.toFixed(1)}
                </div>
              </div>
            )}
            {model.average_design && (
              <div>
                <div className="text-sm text-gray-600">Design</div>
                <div className="text-2xl font-bold">
                  ⭐ {model.average_design.toFixed(1)}
                </div>
              </div>
            )}
          </div>

          {/* Files */}
          {model.files && model.files.length > 0 && (
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold mb-4">Download Bestanden</h2>
              <div className="space-y-2">
                {model.files.map((file: any) => (
                  <a
                    key={file.id}
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{file.file_type?.toUpperCase() || 'FILE'}</span>
                      {file.file_size > 0 && (
                        <span className="text-sm text-gray-600">
                          {(file.file_size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* External Model Link */}
          {(model as any).is_external && (model as any).external_url && (
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold mb-4">Bekijk op Thingiverse</h2>
              <a
                href={(model as any).external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Open op Thingiverse →
              </a>
            </div>
          )}

          {/* Reviews - Only for local models */}
          {!(model as any).is_external && (
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold mb-4">Reviews</h2>
              {user && <ReviewForm modelId={model.id} />}
              <ReviewList reviews={model.reviews || []} modelId={model.id} />
            </div>
          )}

          {/* Comments - Only for local models */}
          {!(model as any).is_external && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Comments</h2>
              {user && <CommentForm modelId={model.id} />}
              <CommentList comments={model.comments || []} modelId={model.id} />
            </div>
          )}

          {/* External model notice */}
          {(model as any).is_external && (
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Dit is een extern model van Thingiverse. Voor reviews en comments, bezoek de{' '}
                  <a
                    href={(model as any).external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline hover:text-blue-900"
                  >
                    Thingiverse pagina
                  </a>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

