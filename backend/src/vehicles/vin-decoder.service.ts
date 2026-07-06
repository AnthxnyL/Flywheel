import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import axios from 'axios'
import { getMaintenancePresets } from './maintenance-presets'

interface NhtsaVariable {
  Variable: string
  Value: string | null
}

export interface DecodedVin {
  vin: string
  brand: string
  model: string
  year: number | null
  fuelType: string | null
  engineDisplacement: string | null
  engineCylinders: string | null
  driveType: string | null
  bodyClass: string | null
  country: string | null
  source: 'nhtsa' | 'mock'
  maintenancePresets: ReturnType<typeof getMaintenancePresets>
}

// Known European WMI prefixes not in NHTSA → mock fallback data
const MOCK_BRANDS: Record<string, { brand: string; country: string }> = {
  VF: { brand: 'Renault', country: 'France' },
  VR: { brand: 'Peugeot', country: 'France' },
  VS: { brand: 'Citroën', country: 'France' },
  VN: { brand: 'Citroën', country: 'France' },
  WBA: { brand: 'BMW',    country: 'Allemagne' },
  WBS: { brand: 'BMW M',  country: 'Allemagne' },
  WDD: { brand: 'Mercedes-Benz', country: 'Allemagne' },
  WVW: { brand: 'Volkswagen', country: 'Allemagne' },
  WAU: { brand: 'Audi',  country: 'Allemagne' },
  WP0: { brand: 'Porsche', country: 'Allemagne' },
  ZAR: { brand: 'Alfa Romeo', country: 'Italie' },
  ZFA: { brand: 'Fiat',  country: 'Italie' },
  SAJ: { brand: 'Jaguar', country: 'Royaume-Uni' },
  SAL: { brand: 'Land Rover', country: 'Royaume-Uni' },
  YV1: { brand: 'Volvo', country: 'Suède' },
}

function pick(results: NhtsaVariable[], variable: string): string | null {
  const found = results.find(r => r.Variable === variable)
  return found?.Value && found.Value !== 'Not Applicable' ? found.Value : null
}

function wmiLookup(vin: string): { brand: string; country: string } | null {
  // Try 3-char WMI first, then 2-char
  const wmi3 = vin.slice(0, 3).toUpperCase()
  const wmi2 = vin.slice(0, 2).toUpperCase()
  return MOCK_BRANDS[wmi3] ?? MOCK_BRANDS[wmi2] ?? null
}

@Injectable()
export class VinDecoderService {
  private readonly logger = new Logger(VinDecoderService.name)

  async decode(vin: string): Promise<DecodedVin> {
    const normalized = vin.toUpperCase().trim()

    if (normalized.length !== 17) {
      throw new BadRequestException('Le VIN doit comporter exactement 17 caractères.')
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) {
      throw new BadRequestException('VIN invalide — caractères I, O et Q non autorisés.')
    }

    try {
      const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${normalized}?format=json`
      const { data } = await axios.get<{ Results: NhtsaVariable[] }>(url, { timeout: 8000 })
      const r = data.Results

      const brand = pick(r, 'Make')
      const model = pick(r, 'Model')
      const yearStr = pick(r, 'Model Year')
      const fuelType = pick(r, 'Fuel Type - Primary')

      // NHTSA returns a result even for unknown VINs — check if we got meaningful data
      if (brand && model) {
        const decoded: DecodedVin = {
          vin: normalized,
          brand: brand,
          model: model,
          year: yearStr ? parseInt(yearStr) : null,
          fuelType: fuelType,
          engineDisplacement: pick(r, 'Displacement (L)'),
          engineCylinders: pick(r, 'Engine Number of Cylinders'),
          driveType: pick(r, 'Drive Type'),
          bodyClass: pick(r, 'Body Class'),
          country: pick(r, 'Plant Country'),
          source: 'nhtsa',
          maintenancePresets: getMaintenancePresets(fuelType ?? 'Gasoline', brand),
        }
        return decoded
      }
    } catch (err) {
      this.logger.warn(`NHTSA API unavailable: ${(err as Error).message}`)
    }

    // Fallback: WMI-based brand lookup + mock data
    const wmi = wmiLookup(normalized)
    const brand = wmi?.brand ?? 'Inconnu'
    const year = this.decodeModelYear(normalized[9])

    return {
      vin: normalized,
      brand,
      model: '',
      year,
      fuelType: null,
      engineDisplacement: null,
      engineCylinders: null,
      driveType: null,
      bodyClass: null,
      country: wmi?.country ?? null,
      source: 'mock',
      maintenancePresets: getMaintenancePresets('Gasoline', brand),
    }
  }

  // VIN position 10 encodes the model year (ISO 3779)
  private decodeModelYear(char: string): number | null {
    const MAP: Record<string, number> = {
      A: 1980, B: 1981, C: 1982, D: 1983, E: 1984, F: 1985, G: 1986, H: 1987,
      J: 1988, K: 1989, L: 1990, M: 1991, N: 1992, P: 1993, R: 1994, S: 1995,
      T: 1996, V: 1997, W: 1998, X: 1999, Y: 2000,
      '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006,
      '7': 2007, '8': 2008, '9': 2009,
      A2: 2010, B2: 2011, C2: 2012, D2: 2013, E2: 2014, F2: 2015, G2: 2016,
      H2: 2017, J2: 2018, K2: 2019, L2: 2020, M2: 2021, N2: 2022, P2: 2023,
      R2: 2024, S2: 2025,
    }
    return MAP[char.toUpperCase()] ?? null
  }
}
