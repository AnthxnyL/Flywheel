import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateVehicleDto } from './dto/create-vehicle.dto'
import { UpdateVehicleDto } from './dto/update-vehicle.dto'

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vehicle.findMany({
      include: {
        driver: { select: { id: true, email: true } },
        contracts: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, email: true } },
        contracts: true,
        maintenanceRecords: { orderBy: { date: 'desc' } },
      },
    })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    return vehicle
  }

  async create(dto: CreateVehicleDto) {
    if (dto.driverId) {
      const driver = await this.prisma.user.findUnique({ where: { id: dto.driverId } })
      if (!driver || driver.role !== 'DRIVER') {
        throw new BadRequestException('Invalid driver id')
      }
    }
    return this.prisma.vehicle.create({
      data: dto,
      include: { driver: { select: { id: true, email: true } } },
    })
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id)
    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
      include: { driver: { select: { id: true, email: true } } },
    })
  }

  async assign(id: string, driverId: string) {
    await this.findOne(id)
    const driver = await this.prisma.user.findUnique({ where: { id: driverId } })
    if (!driver || driver.role !== 'DRIVER') {
      throw new BadRequestException('Invalid driver id')
    }
    return this.prisma.vehicle.update({
      where: { id },
      data: { driverId },
      include: { driver: { select: { id: true, email: true } } },
    })
  }

  async unassign(id: string) {
    await this.findOne(id)
    return this.prisma.vehicle.update({
      where: { id },
      data: { driverId: null },
      include: { driver: { select: { id: true, email: true } } },
    })
  }

  async findByDriver(driverId: string) {
    return this.prisma.vehicle.findMany({
      where: { driverId },
      include: {
        contracts: true,
        maintenanceRecords: { orderBy: { date: 'desc' }, take: 5 },
      },
    })
  }
}
