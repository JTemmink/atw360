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
  const [isOpen, setIsOpen] = useState(true)

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = filters.category_id || filters.tag_ids?.length || filters.is_free !== undefined || filters.pla_compatible !== undefined

  return (
    <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl overflow-hidden sticky top-24">
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-white/5 to-transparent">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded-full border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              {[filters.category_id, filters.tag_ids?.length, filters.is_free, filters.pla_compatible !== undefined].filter(Boolean).length}
            </span>
          )}
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Wissen
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Categorie
            </label>
            <div className="relative group">
              <select
                value={filters.category_id || ''}
                onChange={(e) => updateFilter('category_id', e.target.value || undefined)}
                className="w-full appearance-none bg-gray-800/50 text-gray-200 rounded-xl border border-white/10 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer hover:bg-gray-800"
              >
                <option value="">Alle categorieën</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Checkbox Filters Group */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Opties
          </label>
          
          {/* Price Filter */}
          <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={filters.is_free === true}
                onChange={(e) =>
                  updateFilter('is_free', e.target.checked ? true : undefined)
                }
                className="peer appearance-none w-5 h-5 border border-gray-600 rounded bg-gray-800/50 checked:bg-cyan-500 checked:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer"
              />
              <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Alleen gratis</span>
          </label>

          {/* PLA/Bambu Filter */}
          <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={filters.pla_compatible !== false}
                onChange={(e) =>
                  updateFilter('pla_compatible', e.target.checked ? true : false)
                }
                className="peer appearance-none w-5 h-5 border border-gray-600 rounded bg-gray-800/50 checked:bg-purple-500 checked:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
              />
              <svg className="absolute w-3.5 h-3.5 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">PLA / Bambu P1S/P2S</span>
          </label>
        </div>

        {/* Tags Filter */}
        {tags.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Tags
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {tags.map((tag) => {
                const isSelected = filters.tag_ids?.includes(tag.id)
                return (
                  <label key={tag.id} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="relative flex items-center">
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
                        className="peer appearance-none w-4 h-4 border border-gray-600 rounded bg-gray-800/50 checked:bg-cyan-500 checked:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer"
                      />
                      <svg className="absolute w-3 h-3 text-white left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className={`text-sm transition-colors ${isSelected ? 'text-cyan-400 font-medium' : 'text-gray-400 group-hover:text-gray-300'}`}>{tag.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
