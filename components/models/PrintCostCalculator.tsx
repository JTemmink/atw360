'use client'

import { useState } from 'react'
import { calculatePrintCost, parseSTLAndCalculateVolume, CostBreakdown } from '@/lib/utils/cost-calculator'

interface FileWithCost {
  id: string
  file_url: string
  file_type: string
  file_size: number
  cost?: CostBreakdown
  loading: boolean
  error?: string
}

interface PrintCostCalculatorProps {
  files: Array<{ id: string; file_url: string; file_type: string; file_size: number }>
  material?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
  onTimeout?: () => void
}

export default function PrintCostCalculator({
  files,
  material = 'PLA',
  onTimeout,
}: PrintCostCalculatorProps) {
  const [filesWithCosts, setFilesWithCosts] = useState<FileWithCost[]>([])
  const [totalCost, setTotalCost] = useState<CostBreakdown | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [hasCalculated, setHasCalculated] = useState(false)

  // Filter only STL files
  const stlFiles = files.filter(
    (f) => f.file_type?.toUpperCase() === 'STL' || f.file_url?.toLowerCase().endsWith('.stl')
  )

  if (stlFiles.length === 0) return null

  // Helper function to fetch STL file
  const fetchSTLFile = async (url: string): Promise<Blob> => {
    const shouldUseProxy = () => {
      try {
        const urlObj = new URL(url)
        return (
          urlObj.hostname.includes('thingiverse.com') ||
          urlObj.hostname.includes('cdn.thingiverse.com') ||
          urlObj.hostname.includes('googleusercontent.com')
        )
      } catch {
        return false
      }
    }

    if (shouldUseProxy()) {
      const proxyUrl = `/api/stl-proxy?url=${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)
      if (!response.ok) throw new Error('Kon bestand niet laden')
      return response.blob()
    }

    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
      if (response.ok) return response.blob()
      throw new Error('Direct fetch failed')
    } catch {
      const proxyUrl = `/api/stl-proxy?url=${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)
      if (!response.ok) throw new Error('Kon bestand niet laden')
      return response.blob()
    }
  }

  // Get file name from URL
  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname
      const fileName = path.split('/').pop() || 'bestand.stl'
      return decodeURIComponent(fileName)
    } catch {
      return 'bestand.stl'
    }
  }

  const handleCalculate = async () => {
    setIsCalculating(true)
    setHasCalculated(true)
    
    // Initialize files with loading state
    setFilesWithCosts(stlFiles.map(f => ({ ...f, loading: true })))

    const results: FileWithCost[] = []
    let totalVolume = 0
    let totalWeight = 0
    let totalPrintTime = 0

    // Set timeout for slow calculations
    const timeoutId = setTimeout(() => {
      if (onTimeout) onTimeout()
    }, 15000)

    try {
      for (const file of stlFiles) {
        try {
          const blob = await fetchSTLFile(file.file_url)
          const volume = await parseSTLAndCalculateVolume(blob)
          const cost = calculatePrintCost({ volume, material })
          
          totalVolume += volume
          totalWeight += cost.estimatedWeight
          totalPrintTime += cost.estimatedPrintTime

          results.push({
            ...file,
            cost,
            loading: false,
          })
        } catch (err: any) {
          results.push({
            ...file,
            loading: false,
            error: err.message || 'Fout bij berekenen',
          })
        }

        // Update state after each file
        setFilesWithCosts([...results, ...stlFiles.slice(results.length).map(f => ({ ...f, loading: true }))])
      }

      // Calculate total cost if we have successful results
      const successfulResults = results.filter(r => r.cost)
      if (successfulResults.length > 0) {
        const combinedCost = calculatePrintCost({ volume: totalVolume, material })
        setTotalCost(combinedCost)
      }

      setFilesWithCosts(results)
    } finally {
      clearTimeout(timeoutId)
      setIsCalculating(false)
    }
  }

  return (
    <div className="p-6 border-b border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Printkosten
        </h2>
        
        {!hasCalculated && (
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/20 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCalculating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Berekenen...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Bereken prijs
              </>
            )}
          </button>
        )}
      </div>

      {/* Per-file costs - only show after calculation */}
      {hasCalculated && filesWithCosts.length > 0 && (
        <div className="space-y-3 mb-6">
          {filesWithCosts.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-white/5"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{getFileName(file.file_url)}</p>
                  {file.cost && (
                    <p className="text-xs text-gray-500">
                      {file.cost.estimatedWeight.toFixed(0)}g • {file.cost.estimatedPrintTime.toFixed(1)} uur
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4">
                {file.loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs text-gray-500">Berekenen...</span>
                  </div>
                ) : file.error ? (
                  <span className="text-xs text-red-400">Fout</span>
                ) : file.cost ? (
                  <span className="text-lg font-bold text-green-400">€{file.cost.total.toFixed(2)}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total cost breakdown - only show after calculation */}
      {totalCost && hasCalculated && (
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 rounded-xl p-5 border border-green-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Totaal overzicht</h3>
            <span className="text-2xl font-bold text-white">€{totalCost.total.toFixed(2)}</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Materiaal ({material})</span>
              <span className="text-gray-300">€{totalCost.materialCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Elektriciteit</span>
              <span className="text-gray-300">€{totalCost.electricityCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Arbeid</span>
              <span className="text-gray-300">€{totalCost.laborCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Machine afschrijving</span>
              <span className="text-gray-300">€{totalCost.machineDepreciation.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Marge (30%)</span>
              <span className="text-gray-300">€{totalCost.profitMargin.toFixed(2)}</span>
            </div>
            
            <div className="border-t border-white/10 pt-3 mt-3">
              <div className="flex justify-between text-gray-400">
                <span>Totaal gewicht</span>
                <span className="text-white font-medium">{totalCost.estimatedWeight.toFixed(0)}g</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Totale printtijd</span>
                <span className="text-white font-medium">{totalCost.estimatedPrintTime.toFixed(1)} uur</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-white/5">
            * Geschatte kosten incl. BTW. Werkelijke kosten kunnen afwijken.
          </p>
        </div>
      )}
    </div>
  )
}
