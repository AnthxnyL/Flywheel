import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePlanItemDto } from './dto/create-plan-item.dto'
import { UpdatePlanItemDto } from './dto/update-plan-item.dto'
import { MarkDoneDto } from './dto/mark-done.dto'

export interface PlanItemWithStatus {
  id: string
  operationType: string
  dueDate: Date | null
  intervalKm: number | null
  intervalMonths: number | null
  lastDoneKm: number | null
  lastDoneDate: Date | null
  notes: string | null
  nextDueKm: number | null
  nextDueDate: Date | null
  status: 'ok' | 'soon' | 'overdue'
  alertKm: number | null
  alertDays: number | null
}

type RawItem = {
  id: string
  operationType: string
  dueDate: Date | null
  intervalKm: number | null
  intervalMonths: number | null
  lastDoneKm: number | null
  lastDoneDate: Date | null
  notes: string | null
}

function computeStatus(item: RawItem, currentMileage: number): Pick<PlanItemWithStatus, 'nextDueKm' | 'nextDueDate' | 'status' | 'alertKm' | 'alertDays'> {
  const now = new Date()
  let nextDueKm: number | null = null
  let nextDueDate: Date | null = null
  let alertKm: number | null = null
  let alertDays: number | null = null

  // Fixed due date takes priority over interval calculation
  if (item.dueDate) {
    nextDueDate = item.dueDate
    alertDays = Math.ceil((item.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  } else if (item.intervalMonths !== null) {
    const base = item.lastDoneDate ? new Date(item.lastDoneDate) : now
    nextDueDate = new Date(base)
    nextDueDate.setMonth(nextDueDate.getMonth() + item.intervalMonths)
    alertDays = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (item.intervalKm !== null) {
    const base = item.lastDoneKm ?? 0
    nextDueKm = base + item.intervalKm
    alertKm = nextDueKm - currentMileage
  }

  const kmOverdue = alertKm !== null && alertKm < 0
  const dateOverdue = alertDays !== null && alertDays < 0
  const kmSoon = alertKm !== null && alertKm >= 0 && item.intervalKm !== null && alertKm < item.intervalKm * 0.1
  const dateSoon = alertDays !== null && alertDays >= 0 && alertDays < 30

  let status: 'ok' | 'soon' | 'overdue' = 'ok'
  if (kmOverdue || dateOverdue) status = 'overdue'
  else if (kmSoon || dateSoon) status = 'soon'

  return { nextDueKm, nextDueDate, status, alertKm, alertDays }
}

@Injectable()
export class MaintenancePlanService {
  constructor(private prisma: PrismaService) {}

  private async getVehicleMileage(vehicleId: string): Promise<number> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    return vehicle.mileage
  }

  private enrich(item: RawItem, mileage: number): PlanItemWithStatus {
    return { ...item, ...computeStatus(item, mileage) }
  }

  async findAll(vehicleId: string): Promise<PlanItemWithStatus[]> {
    const mileage = await this.getVehicleMileage(vehicleId)
    const items = await this.prisma.maintenancePlanItem.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'asc' },
    })
    return items.map(i => this.enrich(i, mileage))
  }

  async create(vehicleId: string, dto: CreatePlanItemDto): Promise<PlanItemWithStatus> {
    if (!dto.dueDate && !dto.intervalKm && !dto.intervalMonths) {
      throw new BadRequestException('Une date d\'échéance ou un intervalle (km ou mois) est requis.')
    }
    const mileage = await this.getVehicleMileage(vehicleId)
    const item = await this.prisma.maintenancePlanItem.create({
      data: {
        vehicleId,
        operationType: dto.operationType,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        intervalKm: dto.intervalKm,
        intervalMonths: dto.intervalMonths,
        lastDoneKm: dto.lastDoneKm,
        lastDoneDate: dto.lastDoneDate ? new Date(dto.lastDoneDate) : null,
        notes: dto.notes,
      },
    })
    return this.enrich(item, mileage)
  }

  async update(vehicleId: string, itemId: string, dto: UpdatePlanItemDto): Promise<PlanItemWithStatus> {
    const existing = await this.prisma.maintenancePlanItem.findUnique({ where: { id: itemId } })
    if (!existing || existing.vehicleId !== vehicleId) throw new NotFoundException('Plan item not found')

    const mileage = await this.getVehicleMileage(vehicleId)
    const item = await this.prisma.maintenancePlanItem.update({
      where: { id: itemId },
      data: {
        ...(dto.operationType !== undefined && { operationType: dto.operationType }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.intervalKm !== undefined && { intervalKm: dto.intervalKm }),
        ...(dto.intervalMonths !== undefined && { intervalMonths: dto.intervalMonths }),
        ...(dto.lastDoneKm !== undefined && { lastDoneKm: dto.lastDoneKm }),
        ...(dto.lastDoneDate !== undefined && { lastDoneDate: dto.lastDoneDate ? new Date(dto.lastDoneDate) : null }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    })
    return this.enrich(item, mileage)
  }

  async markDone(vehicleId: string, itemId: string, dto: MarkDoneDto): Promise<PlanItemWithStatus> {
    const existing = await this.prisma.maintenancePlanItem.findUnique({ where: { id: itemId } })
    if (!existing || existing.vehicleId !== vehicleId) throw new NotFoundException('Plan item not found')

    const mileage = await this.getVehicleMileage(vehicleId)
    const doneDate = dto.doneAtDate ? new Date(dto.doneAtDate) : new Date()
    const item = await this.prisma.maintenancePlanItem.update({
      where: { id: itemId },
      data: {
        lastDoneKm: dto.doneAtKm ?? mileage,
        lastDoneDate: doneDate,
        // Clear the fixed due date once marked as done
        dueDate: null,
      },
    })
    return this.enrich(item, mileage)
  }

  async remove(vehicleId: string, itemId: string): Promise<void> {
    const existing = await this.prisma.maintenancePlanItem.findUnique({ where: { id: itemId } })
    if (!existing || existing.vehicleId !== vehicleId) throw new NotFoundException('Plan item not found')
    await this.prisma.maintenancePlanItem.delete({ where: { id: itemId } })
  }
}
