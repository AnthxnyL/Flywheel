import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePlanItemDto } from './dto/create-plan-item.dto'
import { UpdatePlanItemDto } from './dto/update-plan-item.dto'
import { MarkDoneDto } from './dto/mark-done.dto'

export interface PlanItemWithStatus {
  id: string
  operationType: string
  intervalKm: number | null
  intervalMonths: number | null
  lastDoneKm: number | null
  lastDoneDate: Date | null
  notes: string | null
  nextDueKm: number | null
  nextDueDate: Date | null
  // 'ok' | 'soon' | 'overdue'
  status: 'ok' | 'soon' | 'overdue'
  alertKm: number | null   // km remaining before due (negative = overdue)
  alertDays: number | null // days remaining before due (negative = overdue)
}

function computeStatus(
  item: { intervalKm: number | null; intervalMonths: number | null; lastDoneKm: number | null; lastDoneDate: Date | null },
  currentMileage: number,
): Pick<PlanItemWithStatus, 'nextDueKm' | 'nextDueDate' | 'status' | 'alertKm' | 'alertDays'> {
  const now = new Date()
  let nextDueKm: number | null = null
  let nextDueDate: Date | null = null
  let alertKm: number | null = null
  let alertDays: number | null = null

  if (item.intervalKm !== null) {
    const base = item.lastDoneKm ?? 0
    nextDueKm = base + item.intervalKm
    alertKm = nextDueKm - currentMileage
  }

  if (item.intervalMonths !== null) {
    const base = item.lastDoneDate ? new Date(item.lastDoneDate) : now
    nextDueDate = new Date(base)
    nextDueDate.setMonth(nextDueDate.getMonth() + item.intervalMonths)
    alertDays = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Overdue: any threshold exceeded
  const kmOverdue = alertKm !== null && alertKm < 0
  const dateOverdue = alertDays !== null && alertDays < 0

  // Soon threshold: <10% of interval remaining in km, or <30 days
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

  private enrich(item: { id: string; operationType: string; intervalKm: number | null; intervalMonths: number | null; lastDoneKm: number | null; lastDoneDate: Date | null; notes: string | null }, mileage: number): PlanItemWithStatus {
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
    if (!dto.intervalKm && !dto.intervalMonths) {
      throw new BadRequestException('Au moins un intervalle (km ou mois) est requis.')
    }
    const mileage = await this.getVehicleMileage(vehicleId)
    const item = await this.prisma.maintenancePlanItem.create({
      data: {
        vehicleId,
        operationType: dto.operationType,
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
    const item = await this.prisma.maintenancePlanItem.update({
      where: { id: itemId },
      data: {
        lastDoneKm: dto.doneAtKm ?? mileage,
        lastDoneDate: dto.doneAtDate ? new Date(dto.doneAtDate) : new Date(),
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
