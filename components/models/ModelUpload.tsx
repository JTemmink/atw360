'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ModelUploadProps {
  categories: { id: string; name: string }[]
  tags: { id: string; name: string }[]
}

export default function ModelUpload({ categories, tags }: ModelUploadProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (!['stl', 'obj', 'gltf', 'glb'].includes(ext || '')) {
        setError('Alleen STL, OBJ, GLTF of GLB bestanden zijn toegestaan')
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnail(e.target.files[0])
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name || !file) {
      setError('Naam en bestand zijn verplicht')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    if (categoryId) formData.append('category_id', categoryId)
    if (selectedTags.length) formData.append('tag_ids', selectedTags.join(','))
    formData.append('file', file)
    if (thumbnail) formData.append('thumbnail', thumbnail)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError('Je moet ingelogd zijn')
        setLoading(false)
        return
      }

      const response = await fetch('/api/models/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload mislukt')
      }

      router.push(`/models/${data.model.id}`)
    } catch (err: any) {
      setError(err.message || 'Upload mislukt')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Naam *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Beschrijving
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categorie
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            <option value="">Geen categorie</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTags.includes(tag.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Bestand * (STL, OBJ, GLTF, GLB)
          </label>
          <input
            type="file"
            accept=".stl,.obj,.gltf,.glb"
            onChange={handleFileChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Geselecteerd: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thumbnail (optioneel)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          />
          {thumbnail && (
            <p className="mt-2 text-sm text-gray-600">
              Geselecteerd: {thumbnail.name}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !name || !file}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Uploaden...' : 'Upload Model'}
        </button>
      </div>
    </form>
  )
}




