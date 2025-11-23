'use client'

interface ExternalSearchToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export default function ExternalSearchToggle({
  enabled,
  onChange,
}: ExternalSearchToggleProps) {
  return (
    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm font-medium text-blue-900">
          Ook zoeken in externe databases (Thingiverse, etc.)
        </span>
      </label>
      <p className="text-xs text-blue-700 mt-1 ml-6">
        Vind modellen van populaire 3D-platforms via API
      </p>
    </div>
  )
}

