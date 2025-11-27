'use client'

import { Model, Review, Comment } from '@/lib/types/models'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReviewForm from '@/components/reviews/ReviewForm'
import ReviewList from '@/components/reviews/ReviewList'
import CommentForm from '@/components/comments/CommentForm'
import CommentList from '@/components/comments/CommentList'
import PrintCostCalculator from '@/components/models/PrintCostCalculator'

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
    if (isExternal) return
    
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
    <div className="min-h-screen bg-background pt-20 md:pt-24 pb-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          
          {/* Image - First */}
          {model.thumbnail_url && (
            <div className="w-full aspect-video bg-gray-800 relative">
              <img
                src={model.thumbnail_url}
                alt={model.name}
                className="w-full h-full object-contain"
              />
              {/* Favorite button overlay */}
              {!isExternal && (
                <button
                  onClick={toggleFavorite}
                  className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-all ${
                    isFavorite
                      ? 'bg-red-500/80 text-white'
                      : 'bg-gray-900/60 text-gray-300 hover:bg-gray-900/80'
                  }`}
                >
                  <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              )}
              {isExternal && (model as any).external_url && (
                <a
                  href={(model as any).external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-4 right-4 px-4 py-2 bg-blue-600/80 text-white rounded-lg backdrop-blur-md hover:bg-blue-600 transition-all text-sm font-medium"
                >
                  Open op Thingiverse →
                </a>
              )}
            </div>
          )}

          {/* Title & Description - Under the image */}
          <div className="p-6 border-b border-white/5">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{model.name}</h1>
            {model.description && (
              <p className="text-gray-400 leading-relaxed">{model.description}</p>
            )}
            {model.category && (
              <span className="inline-block mt-4 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm border border-cyan-500/30">
                {model.category.name}
              </span>
            )}
          </div>

          {/* Print Cost Calculator - Under description */}
          {model.files && model.files.length > 0 && (
            <PrintCostCalculator
              files={model.files}
              material="PLA"
              onTimeout={() => {
                const manualButton = document.getElementById('manual-cost-button')
                if (manualButton) {
                  manualButton.style.display = 'block'
                }
              }}
            />
          )}

          {/* Stats */}
          <div className="p-6 border-b border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-800/30 rounded-xl">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Downloads</div>
              <div className="text-xl font-bold text-white">{model.download_count || 0}</div>
            </div>
            {model.average_quality && (
              <div className="text-center p-3 bg-gray-800/30 rounded-xl">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Kwaliteit</div>
                <div className="text-xl font-bold text-yellow-400">⭐ {model.average_quality.toFixed(1)}</div>
              </div>
            )}
            {model.average_printability && (
              <div className="text-center p-3 bg-gray-800/30 rounded-xl">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Printbaarheid</div>
                <div className="text-xl font-bold text-yellow-400">⭐ {model.average_printability.toFixed(1)}</div>
              </div>
            )}
            {model.average_design && (
              <div className="text-center p-3 bg-gray-800/30 rounded-xl">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Design</div>
                <div className="text-xl font-bold text-yellow-400">⭐ {model.average_design.toFixed(1)}</div>
              </div>
            )}
          </div>

          {/* Non-STL Files (other formats) */}
          {model.files && model.files.filter((f: any) => 
            f.file_type?.toUpperCase() !== 'STL' && !f.file_url?.toLowerCase().endsWith('.stl')
          ).length > 0 && (
            <div className="p-6 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4">Overige Bestanden</h2>
              <div className="space-y-2">
                {model.files.filter((f: any) => 
                  f.file_type?.toUpperCase() !== 'STL' && !f.file_url?.toLowerCase().endsWith('.stl')
                ).map((file: any) => (
                  <a
                    key={file.id}
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="font-medium text-gray-300">{file.file_type?.toUpperCase() || 'FILE'}</span>
                    {file.file_size > 0 && (
                      <span className="text-sm text-gray-500">
                        {(file.file_size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Manual Cost Calculation Button (shown on timeout or error) */}
          {model.files && model.files.length > 0 && (
            <div id="manual-cost-button" className="p-6 border-b border-white/5" style={{ display: 'none' }}>
              <button
                onClick={async () => {
                  const stlFile = model.files?.find(
                    (f) => f.file_type?.toUpperCase() === 'STL' || f.file_url?.toLowerCase().endsWith('.stl')
                  )
                  if (stlFile) {
                    try {
                      const response = await fetch(stlFile.file_url)
                      const blob = await response.blob()
                      const { parseSTLAndCalculateVolume, calculatePrintCost } = await import('@/lib/utils/cost-calculator')
                      const volume = await parseSTLAndCalculateVolume(blob)
                      const cost = calculatePrintCost({ volume, material: 'PLA' })
                      alert(`Geschatte kosten: €${cost.total.toFixed(2)}\nGewicht: ${cost.estimatedWeight.toFixed(1)}g\nPrinttijd: ${cost.estimatedPrintTime.toFixed(1)} uur`)
                    } catch (error) {
                      alert('Kon kosten niet berekenen. Neem contact op voor een offerte.')
                    }
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:shadow-lg font-semibold transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Handmatig kosten berekenen
              </button>
            </div>
          )}

          {/* Find Printer Button */}
          <div className="p-6 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white mb-4">Laat dit model printen</h2>
            <a
              href={`mailto:otte@example.com?subject=3D Print Aanvraag&body=Ik wil graag dit model laten printen: ${encodeURIComponent(model.name)}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 font-semibold transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Laat het printen door Otte!
            </a>
          </div>

          {/* Reviews - Only for local models */}
          {!(model as any).is_external && (
            <div className="p-6 border-b border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4">Reviews</h2>
              {user && <ReviewForm modelId={model.id} />}
              <ReviewList reviews={model.reviews || []} modelId={model.id} />
            </div>
          )}

          {/* Comments - Only for local models */}
          {!(model as any).is_external && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Comments</h2>
              {user && <CommentForm modelId={model.id} />}
              <CommentList comments={model.comments || []} modelId={model.id} />
            </div>
          )}

          {/* External model notice */}
          {(model as any).is_external && (
            <div className="p-6">
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-300">
                  Dit is een extern model van Thingiverse. Voor reviews en comments, bezoek de{' '}
                  <a
                    href={(model as any).external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline hover:text-blue-200"
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
