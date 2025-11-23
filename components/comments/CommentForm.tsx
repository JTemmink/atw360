'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CommentFormProps {
  modelId: string
  parentId?: string | null
  onCancel?: () => void
}

export default function CommentForm({ modelId, parentId, onCancel }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!content.trim()) {
      setError('Commentaar mag niet leeg zijn')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('comments').insert({
      model_id: modelId,
      parent_id: parentId || null,
      content: content.trim(),
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setContent('')
      router.refresh()
      if (onCancel) onCancel()
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      {error && (
        <div className="mb-2 p-2 bg-red-50 text-red-800 rounded text-sm">
          {error}
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? 'Schrijf een antwoord...' : 'Schrijf een commentaar...'}
        rows={3}
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Verzenden...' : 'Verzenden'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Annuleren
          </button>
        )}
      </div>
    </form>
  )
}

