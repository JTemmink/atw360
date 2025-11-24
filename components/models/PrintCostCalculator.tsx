'use client'

import { useState, useEffect } from 'react'
import { calculatePrintCost, parseSTLAndCalculateVolume, CostBreakdown } from '@/lib/utils/cost-calculator'

interface PrintCostCalculatorProps {
  files: Array<{ id: string; file_url: string; file_type: string; file_size: number }>
  material?: 'PLA' | 'PETG' | 'ABS' | 'TPU'
  onTimeout?: () => void
}

const TIMEOUT_MS = 10000 // 10 seconds timeout

export default function PrintCostCalculator({
  files,
  material = 'PLA',
  onTimeout,
}: PrintCostCalculatorProps) {
  const [cost, setCost] = useState<CostBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showManualButton, setShowManualButton] = useState(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let mounted = true

    const calculateCost = async () => {
      try {
        // Find first STL file
        const stlFile = files.find(
          (f) => f.file_type?.toUpperCase() === 'STL' || f.file_url?.toLowerCase().endsWith('.stl')
        )

        if (!stlFile) {
          if (mounted) {
            setError('Geen STL bestand gevonden')
            setLoading(false)
          }
          return
        }

        // Set timeout
        timeoutId = setTimeout(() => {
          if (mounted) {
            setShowManualButton(true)
            if (onTimeout) {
              onTimeout()
            }
          }
        }, TIMEOUT_MS)

        // Determine if we should skip direct fetch (Thingiverse blocks CORS)
        const shouldSkipDirectFetch = () => {
          try {
            const urlObj = new URL(stlFile.file_url)
            return (
              urlObj.hostname.includes('thingiverse.com') ||
              urlObj.hostname.includes('cdn.thingiverse.com') ||
              urlObj.hostname.includes('googleusercontent.com')
            )
          } catch {
            return false
          }
        }

        // Fetch STL file (use proxy for CORS issues)
        let response: Response | null = null
        let blob: Blob
        
        const fetchViaProxy = async () => {
          console.log('[Cost Calculator] Using proxy for STL file:', stlFile.file_url)
          const proxyUrl = `/api/stl-proxy?url=${encodeURIComponent(stlFile.file_url)}`
          const proxyResponse = await fetch(proxyUrl)
          if (!proxyResponse.ok) {
            throw new Error('Kon STL bestand niet laden via proxy')
          }
          return proxyResponse.blob()
        }

        if (shouldSkipDirectFetch()) {
          blob = await fetchViaProxy()
        } else {
          try {
            // Try direct fetch first
            response = await fetch(stlFile.file_url, {
              mode: 'cors',
              credentials: 'omit',
            })
            
            if (response.ok) {
              blob = await response.blob()
            } else {
              throw new Error('Direct fetch failed')
            }
          } catch (err) {
            // If CORS fails, use proxy
            blob = await fetchViaProxy()
          }
        }
        
        // Check if it's actually an STL file
        if (blob.size === 0) {
          throw new Error('STL bestand is leeg')
        }

        // Parse STL and calculate volume
        const volume = await parseSTLAndCalculateVolume(blob)

        if (volume <= 0) {
          throw new Error('Kon volume niet berekenen uit STL bestand')
        }

        // Calculate cost
        const costBreakdown = calculatePrintCost({
          volume,
          material,
        })

        if (mounted) {
          clearTimeout(timeoutId)
          setCost(costBreakdown)
          setLoading(false)
        }
      } catch (err: any) {
        if (mounted) {
          clearTimeout(timeoutId)
          setError(err.message || 'Fout bij berekenen kosten')
          setLoading(false)
          setShowManualButton(true)
        }
      }
    }

    calculateCost()

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [files, material, onTimeout])

  if (loading && !showManualButton) {
    return (
      <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-gray-700">Kosten worden berekend...</span>
        </div>
      </div>
    )
  }

  if (error && !cost) {
    return (
      <div className="p-6 border-b">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 mb-2">{error}</p>
          {showManualButton && (
            <button
              onClick={() => {
                // Scroll to manual button or trigger manual calculation
                const manualButton = document.getElementById('manual-cost-button')
                if (manualButton) {
                  manualButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  manualButton.focus()
                }
              }}
              className="text-xs text-yellow-700 underline hover:text-yellow-900"
            >
              Handmatig berekenen →
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!cost) {
    return null
  }

  return (
    <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Geschatte Printkosten
      </h2>
      
      <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-green-700">€{cost.total.toFixed(2)}</span>
          <span className="text-sm text-gray-500">inclusief BTW</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Materiaal ({material})</span>
            <span className="font-medium">€{cost.materialCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Elektriciteit</span>
            <span className="font-medium">€{cost.electricityCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Arbeid</span>
            <span className="font-medium">€{cost.laborCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Machine afschrijving</span>
            <span className="font-medium">€{cost.machineDepreciation.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Winstmarge (30%)</span>
            <span className="font-medium">€{cost.profitMargin.toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Geschat gewicht</span>
              <span className="font-medium">{cost.estimatedWeight.toFixed(1)}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Geschatte printtijd</span>
              <span className="font-medium">{cost.estimatedPrintTime.toFixed(1)} uur</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            * Geschatte kosten op basis van standaard instellingen. Werkelijke kosten kunnen afwijken.
          </p>
        </div>
      </div>
    </div>
  )
}

