'use client'

import { useState } from 'react'
import { SearchFilters } from '@/lib/types/models'

interface FilterPanelProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  categories?: { id: string; name: string }[]
  tags?: { id: string; name: string }[]
}

export default function FilterPanel({
  filters,
  onFiltersChange,
  categories = [],
  tags = [],
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <div className="flex gap-2">
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Wissen
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-600"
          >
            {isOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>

      <div className={`space-y-4 ${isOpen ? 'block' : 'hidden md:block'}`}>
        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categorie
            </label>
            <select
              value={filters.category_id || ''}
              onChange={(e) => updateFilter('category_id', e.target.value || undefined)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Alle categorieën</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tags Filter */}
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tags.map((tag) => {
                const isSelected = filters.tag_ids?.includes(tag.id)
                return (
                  <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected || false}
                      onChange={(e) => {
                        const currentTags = filters.tag_ids || []
                        if (e.target.checked) {
                          updateFilter('tag_ids', [...currentTags, tag.id])
                        } else {
                          updateFilter(
                            'tag_ids',
                            currentTags.filter((id) => id !== tag.id)
                          )
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{tag.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Price Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prijs
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.is_free === true}
              onChange={(e) =>
                updateFilter('is_free', e.target.checked ? true : undefined)
              }
              className="w-4 h-4"
            />
            <span className="text-sm">Alleen gratis</span>
          </label>
        </div>

        {/* Score Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimale scores
          </label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-600">Kwaliteit</label>
              <input
                type="number"
                min="1"
                max="5"
                value={filters.min_quality || ''}
                onChange={(e) =>
                  updateFilter(
                    'min_quality',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                placeholder="Min"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Printbaarheid</label>
              <input
                type="number"
                min="1"
                max="5"
                value={filters.min_printability || ''}
                onChange={(e) =>
                  updateFilter(
                    'min_printability',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                placeholder="Min"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Design</label>
              <input
                type="number"
                min="1"
                max="5"
                value={filters.min_design || ''}
                onChange={(e) =>
                  updateFilter(
                    'min_design',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                placeholder="Min"
              />
            </div>
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sorteren op
          </label>
          <select
            value={filters.sort_by || 'relevance'}
            onChange={(e) =>
              updateFilter('sort_by', e.target.value as SearchFilters['sort_by'])
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="relevance">Relevantie</option>
            <option value="popularity">Populariteit</option>
            <option value="newest">Nieuwste</option>
            <option value="oldest">Oudste</option>
          </select>
        </div>
      </div>
    </div>
  )
}

