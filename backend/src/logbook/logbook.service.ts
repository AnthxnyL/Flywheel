import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { LogEntryType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateLogEntryDto } from './dto/create-log-entry.dto'

export interface TimelineEvent {
  id: string
  source: 'entry' | 'mileage' | 'maintenance'
  type: string
  date: Date
  title: string
  description: string | null
  mileageAtEvent: number | null
  cost: number | null
  documentUrl: string | null
  author: { email: string; role: string } | null
}

@Injectable()
export class LogbookService {
  constructor(private prisma: PrismaService) {}

  private async assertVehicleExists(vehicleId: string) {
    const v = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!v) throw new NotFoundException('Vehicle not found')
    return v
  }

  // Unified timeline: merges manual entries + mileage records + maintenance records
  async getTimeline(vehicleId: string): Promise<TimelineEvent[]> {
    await this.assertVehicleExists(vehicleId)

    const [entries, mileageRecords, maintenanceRecords] = await Promise.all([
      this.prisma.vehicleLogEntry.findMany({
        where: { vehicleId },
        include: { createdBy: { select: { email: true, role: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.mileageRecord.findMany({
        where: { vehicleId },
        include: { recordedBy: { select: { email: true, role: true } } },
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.maintenanceRecord.findMany({
        where: { vehicleId },
        orderBy: { date: 'desc' },
      }),
    ])

    const events: TimelineEvent[] = [
      ...entries.map(e => ({
        id: `entry-${e.id}`,
        source: 'entry' as const,
        type: e.type,
        date: e.date,
        title: e.title,
        description: e.description,
        mileageAtEvent: e.mileageAtEvent,
        cost: e.cost,
        documentUrl: e.documentUrl,
        author: e.createdBy,
      })),
      ...mileageRecords.map(r => ({
        id: `mileage-${r.id}`,
        source: 'mileage' as const,
        type: 'MILEAGE_UPDATE',
        date: r.recordedAt,
        title: `Relevé kilométrique — ${r.mileage.toLocaleString('fr-FR')} km`,
        description: r.note,
        mileageAtEvent: r.mileage,
        cost: null,
        documentUrl: null,
        author: r.recordedBy,
      })),
      ...maintenanceRecords.map(r => ({
        id: `maintenance-${r.id}`,
        source: 'maintenance' as const,
        type: 'MAINTENANCE',
        date: r.date,
        title: r.type,
        description: null,
        mileageAtEvent: null,
        cost: r.cost,
        documentUrl: r.invoiceUrl,
        author: null,
      })),
    ]

    // Sort descending by date
    return events.sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  async addEntry(vehicleId: string, dto: CreateLogEntryDto, userId: string): Promise<TimelineEvent> {
    await this.assertVehicleExists(vehicleId)

    const entry = await this.prisma.vehicleLogEntry.create({
      data: {
        vehicleId,
        type: dto.type as LogEntryType,
        date: new Date(dto.date),
        title: dto.title,
        description: dto.description,
        mileageAtEvent: dto.mileageAtEvent,
        cost: dto.cost,
        documentUrl: dto.documentUrl,
        createdById: userId,
      },
      include: { createdBy: { select: { email: true, role: true } } },
    })

    return {
      id: `entry-${entry.id}`,
      source: 'entry',
      type: entry.type,
      date: entry.date,
      title: entry.title,
      description: entry.description,
      mileageAtEvent: entry.mileageAtEvent,
      cost: entry.cost,
      documentUrl: entry.documentUrl,
      author: entry.createdBy,
    }
  }

  async removeEntry(vehicleId: string, entryId: string, userId: string, userRole: string): Promise<void> {
    const entry = await this.prisma.vehicleLogEntry.findUnique({ where: { id: entryId } })
    if (!entry || entry.vehicleId !== vehicleId) throw new NotFoundException('Entry not found')
    // Only the creator or a DEALER can delete
    if (userRole !== 'DEALER' && entry.createdById !== userId) throw new ForbiddenException()
    await this.prisma.vehicleLogEntry.delete({ where: { id: entryId } })
  }
}
