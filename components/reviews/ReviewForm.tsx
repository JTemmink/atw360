'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ReviewFormProps {
  modelId: string
  existingReview?: {
    quality_score: number
    printability_score: number
    design_score: number
    comment?: string | null
  }
}

export default function ReviewForm({ modelId, existingReview }: ReviewFormProps) {
  const [quality, setQuality] = useState(existingReview?.quality_score || 0)
  const [printability, setPrintability] = useState(
    existingReview?.printability_score || 0
  )
  const [design, setDesign] = useState(existingReview?.design_score || 0)
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (quality === 0 || printability === 0 || design === 0) {
      setError('Geef voor alle scores een waarde op')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('reviews').upsert({
      model_id: modelId,
      quality_score: quality,
      printability_score: printability,
      design_score: design,
      comment: comment || null,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.refresh()
      if (!existingReview) {
        setQuality(0)
        setPrintability(0)
        setDesign(0)
        setComment('')
      }
      setLoading(false)
    }
  }

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number
    onChange: (value: number) => void
    label: string
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl ${
              star <= value ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-500`}
          >
            ⭐
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">{value}/5</span>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        {existingReview ? 'Bewerk je review' : 'Schrijf een review'}
      </h3>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded text-sm">
          {error}
        </div>
      )}
      <StarRating value={quality} onChange={setQuality} label="Kwaliteit" />
      <StarRating
        value={printability}
        onChange={setPrintability}
        label="Printbaarheid"
      />
      <StarRating value={design} onChange={setDesign} label="Design" />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Commentaar (optioneel)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Opslaan...' : existingReview ? 'Bijwerken' : 'Verzenden'}
      </button>
    </form>
  )
}

