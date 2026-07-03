export type Role = 'DRIVER' | 'DEALER' | 'BRAND'

export interface User {
  id: string
  email: string
  role: Role
  createdAt: string
}

export interface Vehicle {
  id: string
  vin: string
  brand: string
  model: string
  mileage: number
  driverId: string
}

export type ContractType = 'LOA' | 'LLD'

export interface Contract {
  id: string
  type: ContractType
  startDate: string
  endDate: string
  mileageLimit: number
  vehicleId: string
}

export interface MaintenanceRecord {
  id: string
  date: string
  type: string
  cost: number
  invoiceUrl: string | null
  vehicleId: string
}
