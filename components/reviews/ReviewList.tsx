'use client'

import { Review } from '@/lib/types/models'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ReviewListProps {
  reviews: Review[]
  modelId: string
}

export default function ReviewList({ reviews: initialReviews, modelId }: ReviewListProps) {
  const [reviews, setReviews] = useState(initialReviews)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setUser(user))
  }, [])

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Weet je zeker dat je deze review wilt verwijderen?')) return

    const { error } = await createClient()
      .from('reviews')
      .delete()
      .eq('id', reviewId)

    if (!error) {
      setReviews(reviews.filter((r) => r.id !== reviewId))
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nog geen reviews. Wees de eerste!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-medium">
                {review.user?.email || 'Anonieme gebruiker'}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(review.created_at).toLocaleDateString('nl-NL')}
              </div>
            </div>
            {user && user.id === review.user_id && (
              <button
                onClick={() => deleteReview(review.id)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Verwijder
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <span className="text-sm text-gray-600">Kwaliteit:</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={i < review.quality_score ? 'text-yellow-400' : 'text-gray-300'}
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Printbaarheid:</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < review.printability_score ? 'text-yellow-400' : 'text-gray-300'
                    }
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Design:</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={i < review.design_score ? 'text-yellow-400' : 'text-gray-300'}
                  >
                    ⭐
                  </span>
                ))}
              </div>
            </div>
          </div>
          {review.comment && (
            <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
          )}
        </div>
      ))}
    </div>
  )
}

