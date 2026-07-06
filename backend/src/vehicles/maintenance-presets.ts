export interface PlanPreset {
  operationType: string
  intervalKm: number | null
  intervalMonths: number | null
}

// Base plans by fuel type
const BASE_PLANS: Record<string, PlanPreset[]> = {
  GASOLINE: [
    { operationType: 'Vidange + filtre à huile',     intervalKm: 15000, intervalMonths: 12 },
    { operationType: 'Filtre à air',                 intervalKm: 30000, intervalMonths: 24 },
    { operationType: "Filtre d'habitacle",           intervalKm: 20000, intervalMonths: 12 },
    { operationType: 'Filtre à carburant',           intervalKm: 30000, intervalMonths: 24 },
    { operationType: 'Bougies d\'allumage',          intervalKm: 30000, intervalMonths: null },
    { operationType: 'Plaquettes de frein avant',    intervalKm: 40000, intervalMonths: null },
    { operationType: 'Plaquettes de frein arrière',  intervalKm: 60000, intervalMonths: null },
    { operationType: 'Courroie de distribution',     intervalKm: 120000, intervalMonths: 60 },
    { operationType: 'Liquide de frein',             intervalKm: null,  intervalMonths: 24 },
    { operationType: 'Liquide de refroidissement',   intervalKm: null,  intervalMonths: 48 },
    { operationType: 'Contrôle technique',           intervalKm: null,  intervalMonths: 24 },
  ],
  DIESEL: [
    { operationType: 'Vidange + filtre à huile',     intervalKm: 20000, intervalMonths: 12 },
    { operationType: 'Filtre à air',                 intervalKm: 40000, intervalMonths: 24 },
    { operationType: "Filtre d'habitacle",           intervalKm: 20000, intervalMonths: 12 },
    { operationType: 'Filtre à carburant',           intervalKm: 40000, intervalMonths: 24 },
    { operationType: 'Filtre à particules (FAP)',    intervalKm: 120000, intervalMonths: null },
    { operationType: 'Plaquettes de frein avant',    intervalKm: 50000, intervalMonths: null },
    { operationType: 'Plaquettes de frein arrière',  intervalKm: 80000, intervalMonths: null },
    { operationType: 'Courroie de distribution',     intervalKm: 150000, intervalMonths: 72 },
    { operationType: 'Liquide de frein',             intervalKm: null,  intervalMonths: 24 },
    { operationType: 'Liquide de refroidissement',   intervalKm: null,  intervalMonths: 48 },
    { operationType: 'Vanne EGR',                   intervalKm: 100000, intervalMonths: null },
    { operationType: 'Contrôle technique',           intervalKm: null,  intervalMonths: 24 },
  ],
  ELECTRIC: [
    { operationType: 'Vérification freins régénératifs', intervalKm: 50000, intervalMonths: 24 },
    { operationType: 'Plaquettes de frein avant',        intervalKm: 80000, intervalMonths: null },
    { operationType: 'Plaquettes de frein arrière',      intervalKm: 100000, intervalMonths: null },
    { operationType: 'Liquide de frein',                 intervalKm: null,  intervalMonths: 24 },
    { operationType: 'Liquide de refroidissement batterie', intervalKm: null, intervalMonths: 48 },
    { operationType: 'Pneus',                            intervalKm: 30000, intervalMonths: null },
    { operationType: 'Vérification système batterie',    intervalKm: null,  intervalMonths: 24 },
    { operationType: 'Contrôle technique',               intervalKm: null,  intervalMonths: 24 },
  ],
  HYBRID: [
    { operationType: 'Vidange + filtre à huile',         intervalKm: 15000, intervalMonths: 12 },
    { operationType: 'Filtre à air',                     intervalKm: 30000, intervalMonths: 24 },
    { operationType: "Filtre d'habitacle",               intervalKm: 20000, intervalMonths: 12 },
    { operationType: 'Bougies d\'allumage',              intervalKm: 60000, intervalMonths: null },
    { operationType: 'Plaquettes de frein avant',        intervalKm: 60000, intervalMonths: null },
    { operationType: 'Plaquettes de frein arrière',      intervalKm: 80000, intervalMonths: null },
    { operationType: 'Liquide de frein',                 intervalKm: null,  intervalMonths: 24 },
    { operationType: 'Liquide de refroidissement',       intervalKm: null,  intervalMonths: 48 },
    { operationType: 'Vérification système batterie',    intervalKm: null,  intervalMonths: 36 },
    { operationType: 'Contrôle technique',               intervalKm: null,  intervalMonths: 24 },
  ],
}

// Brand-specific overrides (merged with fuel-type base plan)
const BRAND_OVERRIDES: Record<string, Partial<PlanPreset>[]> = {
  TESLA: [
    { operationType: 'Vérification freins régénératifs', intervalKm: 80000, intervalMonths: 36 },
    { operationType: 'Liquide de frein',                 intervalKm: null,  intervalMonths: 24 },
    { operationType: 'Filtre d\'habitacle HEPA',         intervalKm: null,  intervalMonths: 12 },
    { operationType: 'Vérification système batterie',    intervalKm: null,  intervalMonths: 12 },
    { operationType: 'Contrôle technique',               intervalKm: null,  intervalMonths: 24 },
  ],
  BMW: [
    { operationType: 'Vidange + filtre à huile',    intervalKm: 25000, intervalMonths: 12 },
    { operationType: 'Microfiltre / filtre habitacle', intervalKm: 25000, intervalMonths: 12 },
    { operationType: 'Courroie de distribution',    intervalKm: 120000, intervalMonths: 72 },
  ],
  MERCEDES: [
    { operationType: 'Vidange + filtre à huile',    intervalKm: 25000, intervalMonths: 12 },
    { operationType: 'Inspection Service A',        intervalKm: 15000, intervalMonths: 12 },
    { operationType: 'Inspection Service B',        intervalKm: 30000, intervalMonths: 24 },
  ],
  RENAULT: [
    { operationType: 'Vidange + filtre à huile',    intervalKm: 20000, intervalMonths: 12 },
    { operationType: 'Distribution (courroie)',      intervalKm: 120000, intervalMonths: 72 },
  ],
  VOLKSWAGEN: [
    { operationType: 'Vidange + filtre à huile',    intervalKm: 15000, intervalMonths: 12 },
    { operationType: 'Inspection longue',           intervalKm: 30000, intervalMonths: 24 },
  ],
}

function normalizeFuelType(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('electric') || lower.includes('électr')) return 'ELECTRIC'
  if (lower.includes('hybrid') || lower.includes('hybr')) return 'HYBRID'
  if (lower.includes('diesel')) return 'DIESEL'
  return 'GASOLINE'
}

function normalizeBrand(raw: string): string {
  return raw.toUpperCase().trim()
}

export function getMaintenancePresets(fuelType: string, brand: string): PlanPreset[] {
  const fuelKey = normalizeFuelType(fuelType)
  const brandKey = normalizeBrand(brand)

  const base = BASE_PLANS[fuelKey] ?? BASE_PLANS['GASOLINE']
  const overrides = BRAND_OVERRIDES[brandKey] ?? []

  if (overrides.length === 0) return base

  // Merge: replace matching operation types, add new ones
  const merged = [...base]
  for (const override of overrides) {
    const idx = merged.findIndex(p => p.operationType === override.operationType)
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...override } as PlanPreset
    } else {
      merged.push(override as PlanPreset)
    }
  }
  return merged
}
