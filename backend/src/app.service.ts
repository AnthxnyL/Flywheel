import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Flywheel API'
  }

  async getDashboardStats() {
    const [vehicleCount, clientCount, maintenanceItems] = await Promise.all([
      this.prisma.vehicle.count(),
      this.prisma.user.count({ where: { role: 'DRIVER', emailVerified: true } }),
      this.prisma.maintenancePlanItem.findMany({
        select: { intervalMonths: true, intervalKm: true, lastDoneDate: true, lastDoneKm: true, vehicle: { select: { mileage: true } } },
      }),
    ])

    const now = new Date()
    const alertCount = maintenanceItems.filter(item => {
      const overdueByDate = item.intervalMonths && item.lastDoneDate
        ? (now.getTime() - item.lastDoneDate.getTime()) / (1000 * 60 * 60 * 24 * 30) >= item.intervalMonths
        : item.intervalMonths && !item.lastDoneDate

      const overdueByKm = item.intervalKm && item.lastDoneKm != null
        ? (item.vehicle.mileage - item.lastDoneKm) >= item.intervalKm
        : false

      return overdueByDate || overdueByKm
    }).length

    return { vehicleCount, clientCount, alertCount }
  }
}
