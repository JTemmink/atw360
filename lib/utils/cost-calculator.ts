// 3D Print Cost Calculator
// Based on standard cost calculation for 3D printing services

export interface CostCalculationParams {
  volume: number // in cm³
  material: 'PLA' | 'PETG' | 'ABS' | 'TPU'
  layerHeight?: number // in mm
  infill?: number // percentage
  printTime?: number // in hours (if not provided, will be estimated)
}

export interface CostBreakdown {
  materialCost: number
  electricityCost: number
  laborCost: number
  machineDepreciation: number
  profitMargin: number
  total: number
  estimatedPrintTime: number // in hours
  estimatedWeight: number // in grams
}

// Material densities (g/cm³)
const MATERIAL_DENSITIES: Record<string, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  TPU: 1.20,
}

// Material prices per kg (€)
const MATERIAL_PRICES: Record<string, number> = {
  PLA: 35, // €25 per kg
  PETG: 28,
  ABS: 30,
  TPU: 45,
}

// Printer settings (Bambu P1S/P2S)
const PRINTER_SETTINGS = {
  powerConsumption: 150, // watts
  electricityPrice: 0.20, // € per kWh
  laborRate: 6, // € per hour
  machineDepreciationRate: 0.05, // 5% of material cost
  profitMargin: 0.30, // 30% profit margin
  averagePrintSpeed: 50, // mm/s
  layerHeight: 0.2, // mm (default)
  infill: 15, // percentage (default)
}

// Estimate print time based on volume and settings
function estimatePrintTime(
  volume: number,
  layerHeight: number = PRINTER_SETTINGS.layerHeight,
  infill: number = PRINTER_SETTINGS.infill
): number {
  // Rough estimation: larger volume = longer print time
  // This is a simplified calculation - real slicer would be more accurate
  const baseTime = volume / 100 // Base time in hours (rough estimate)
  const layerMultiplier = PRINTER_SETTINGS.layerHeight / layerHeight // Thinner layers = more time
  const infillMultiplier = infill / PRINTER_SETTINGS.infill // More infill = more time
  
  return baseTime * layerMultiplier * infillMultiplier
}

export function calculatePrintCost(
  params: CostCalculationParams
): CostBreakdown {
  const {
    volume,
    material = 'PLA',
    layerHeight = PRINTER_SETTINGS.layerHeight,
    infill = PRINTER_SETTINGS.infill,
    printTime,
  } = params

  // Calculate weight
  const density = MATERIAL_DENSITIES[material] || MATERIAL_DENSITIES.PLA
  const weight = volume * density // in grams

  // Estimate print time if not provided
  const estimatedPrintTime = printTime || estimatePrintTime(volume, layerHeight, infill)

  // Material cost
  const materialPricePerKg = MATERIAL_PRICES[material] || MATERIAL_PRICES.PLA
  const materialCost = (weight / 1000) * materialPricePerKg

  // Electricity cost
  const electricityCost =
    (PRINTER_SETTINGS.powerConsumption / 1000) *
    estimatedPrintTime *
    PRINTER_SETTINGS.electricityPrice

  // Labor cost (setup, monitoring, post-processing)
  const laborTime = Math.max(0.5, estimatedPrintTime * 0.1) // At least 30 min, 10% of print time
  const laborCost = laborTime * PRINTER_SETTINGS.laborRate

  // Machine depreciation (5% of material cost)
  const machineDepreciation = materialCost * PRINTER_SETTINGS.machineDepreciationRate

  // Subtotal before profit
  const subtotal = materialCost + electricityCost + laborCost + machineDepreciation

  // Profit margin (30%)
  const profitMargin = subtotal * PRINTER_SETTINGS.profitMargin

  // Total cost
  const total = subtotal + profitMargin

  return {
    materialCost: Math.round(materialCost * 100) / 100,
    electricityCost: Math.round(electricityCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    machineDepreciation: Math.round(machineDepreciation * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    total: Math.round(total * 100) / 100,
    estimatedPrintTime: Math.round(estimatedPrintTime * 10) / 10,
    estimatedWeight: Math.round(weight * 10) / 10,
  }
}

// Parse STL file and calculate volume
export async function parseSTLAndCalculateVolume(file: File | Blob): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)
  
  // Check if binary STL (first 80 bytes are header, then 4 bytes for triangle count)
  const isBinary = data.length > 84 && data[80] !== 0 && data[80] !== 0x20
  
  if (isBinary) {
    return parseBinarySTL(data)
  } else {
    return parseASCIISTL(data)
  }
}

function parseBinarySTL(data: Uint8Array): number {
  // Binary STL format:
  // 80-byte header
  // 4-byte triangle count (little-endian)
  // For each triangle: 12 floats (normal vector) + 9 floats (vertices) + 2-byte attribute
  
  if (data.length < 84) {
    throw new Error('STL bestand te klein')
  }
  
  const triangleCount = new DataView(data.buffer, 80, 4).getUint32(0, true)
  
  if (triangleCount === 0 || triangleCount > 10000000) {
    throw new Error('Ongeldig aantal driehoeken in STL')
  }
  
  // Check if file size matches expected size
  const expectedSize = 84 + triangleCount * 50
  if (data.length < expectedSize) {
    throw new Error('STL bestand is onvolledig')
  }
  
  let totalVolume = 0
  let offset = 84
  
  for (let i = 0; i < triangleCount && offset + 50 <= data.length; i++) {
    // Skip normal (12 bytes)
    offset += 12
    
    // Read vertices (36 bytes = 3 vertices * 3 floats * 4 bytes)
    const v1 = {
      x: new DataView(data.buffer, offset, 4).getFloat32(0, true),
      y: new DataView(data.buffer, offset + 4, 4).getFloat32(0, true),
      z: new DataView(data.buffer, offset + 8, 4).getFloat32(0, true),
    }
    const v2 = {
      x: new DataView(data.buffer, offset + 12, 4).getFloat32(0, true),
      y: new DataView(data.buffer, offset + 16, 4).getFloat32(0, true),
      z: new DataView(data.buffer, offset + 20, 4).getFloat32(0, true),
    }
    const v3 = {
      x: new DataView(data.buffer, offset + 24, 4).getFloat32(0, true),
      y: new DataView(data.buffer, offset + 28, 4).getFloat32(0, true),
      z: new DataView(data.buffer, offset + 32, 4).getFloat32(0, true),
    }
    
    // Calculate signed volume of tetrahedron from origin
    // Using the formula: V = (1/6) * |det(v1, v2, v3)|
    const volume = Math.abs(
      v1.x * (v2.y * v3.z - v3.y * v2.z) -
      v1.y * (v2.x * v3.z - v3.x * v2.z) +
      v1.z * (v2.x * v3.y - v3.x * v2.y)
    ) / 6
    
    if (isNaN(volume) || !isFinite(volume)) {
      continue // Skip invalid triangles
    }
    
    totalVolume += volume
    
    // Skip attribute (2 bytes)
    offset += 38
  }
  
  if (totalVolume <= 0) {
    throw new Error('Kon volume niet berekenen (geen geldige driehoeken)')
  }
  
  // Convert from mm³ to cm³
  return totalVolume / 1000
}

function parseASCIISTL(data: Uint8Array): number {
  // ASCII STL parsing (simplified - would need proper parser in production)
  const text = new TextDecoder().decode(data)
  const vertices: { x: number; y: number; z: number }[] = []
  
  // Extract vertices from "vertex x y z" lines
  const vertexRegex = /vertex\s+([\d\.\-eE]+)\s+([\d\.\-eE]+)\s+([\d\.\-eE]+)/g
  let match
  
  while ((match = vertexRegex.exec(text)) !== null) {
    vertices.push({
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      z: parseFloat(match[3]),
    })
  }
  
  // Calculate volume from triangles
  let totalVolume = 0
  for (let i = 0; i < vertices.length; i += 3) {
    if (i + 2 < vertices.length) {
      const v1 = vertices[i]
      const v2 = vertices[i + 1]
      const v3 = vertices[i + 2]
      
      const volume = Math.abs(
        v1.x * (v2.y * v3.z - v3.y * v2.z) -
        v1.y * (v2.x * v3.z - v3.x * v2.z) +
        v1.z * (v2.x * v3.y - v3.x * v2.y)
      ) / 6
      
      totalVolume += volume
    }
  }
  
  // Convert from mm³ to cm³
  return totalVolume / 1000
}

