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

  const hasActiveFilters = filters.category_id || filters.tag_ids?.length || filters.is_free !== undefined || filters.min_quality || filters.min_printability || filters.min_design || filters.pla_compatible !== undefined

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-md p-4 sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
              {[filters.category_id, filters.tag_ids?.length, filters.is_free, filters.min_quality, filters.min_printability, filters.min_design].filter(Boolean).length}
            </span>
          )}
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            Wissen
          </button>
        )}
      </div>

      <div className={`space-y-3 ${isOpen ? 'block' : 'hidden md:block'}`}>
        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Categorie
            </label>
            <select
              value={filters.category_id || ''}
              onChange={(e) => updateFilter('category_id', e.target.value || undefined)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
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
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Tags
            </label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {tags.map((tag) => {
                const isSelected = filters.tag_ids?.includes(tag.id)
                return (
                  <label key={tag.id} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 p-1 rounded">
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
                      className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-700">{tag.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Price Filter */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
            <input
              type="checkbox"
              checked={filters.is_free === true}
              onChange={(e) =>
                updateFilter('is_free', e.target.checked ? true : undefined)
              }
              className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-700">Alleen gratis</span>
          </label>
        </div>

        {/* PLA/Bambu Filter */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
            <input
              type="checkbox"
              checked={filters.pla_compatible !== false}
              onChange={(e) =>
                updateFilter('pla_compatible', e.target.checked ? true : false)
              }
              className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-700">PLA / Bambu P1S/P2S</span>
          </label>
        </div>

        {/* Score Filters */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Minimale scores
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Kwaliteit</label>
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
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Min"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Print</label>
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
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Min"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Design</label>
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
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Min"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

