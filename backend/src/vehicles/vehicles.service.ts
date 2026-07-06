import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateVehicleDto } from './dto/create-vehicle.dto'
import { UpdateVehicleDto } from './dto/update-vehicle.dto'
import { CreateMileageRecordDto } from './dto/create-mileage-record.dto'

const VEHICLE_INCLUDE = {
  driver: { select: { id: true, email: true } },
  contracts: true,
  mileageRecords: { orderBy: { recordedAt: 'desc' as const }, take: 20, include: { recordedBy: { select: { id: true, email: true, role: true } } } },
  maintenanceRecords: { orderBy: { date: 'desc' as const } },
}

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
      include: VEHICLE_INCLUDE,
    })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    return vehicle
  }

  async create(dto: CreateVehicleDto, createdById: string) {
    if (dto.driverId) {
      const driver = await this.prisma.user.findUnique({ where: { id: dto.driverId } })
      if (!driver || driver.role !== 'DRIVER') {
        throw new BadRequestException('Invalid driver id')
      }
    }

    const initialMileage = dto.initialMileage ?? dto.mileage

    const vehicle = await this.prisma.vehicle.create({
      data: {
        vin: dto.vin,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        licensePlate: dto.licensePlate,
        mileage: dto.mileage,
        initialMileage,
        driverId: dto.driverId,
        // Create the first mileage record automatically
        mileageRecords: {
          create: {
            mileage: dto.mileage,
            note: 'Kilométrage initial à l\'entrée en flotte',
            recordedById: createdById,
          },
        },
      },
      include: VEHICLE_INCLUDE,
    })
    return vehicle
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id)
    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
      include: VEHICLE_INCLUDE,
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
      include: VEHICLE_INCLUDE,
    })
  }

  async unassign(id: string) {
    await this.findOne(id)
    return this.prisma.vehicle.update({
      where: { id },
      data: { driverId: null },
      include: VEHICLE_INCLUDE,
    })
  }

  async findByDriver(driverId: string) {
    return this.prisma.vehicle.findMany({
      where: { driverId },
      include: {
        contracts: true,
        maintenanceRecords: { orderBy: { date: 'desc' }, take: 5 },
        mileageRecords: { orderBy: { recordedAt: 'desc' }, take: 10, include: { recordedBy: { select: { id: true, email: true, role: true } } } },
      },
    })
  }

  async addMileageRecord(vehicleId: string, dto: CreateMileageRecordDto, userId: string) {
    const vehicle = await this.findOne(vehicleId)

    if (dto.mileage < vehicle.mileage) {
      throw new BadRequestException(
        `Le kilométrage (${dto.mileage} km) ne peut pas être inférieur au relevé actuel (${vehicle.mileage} km).`
      )
    }

    // Update vehicle current mileage + insert record in a transaction
    const [record] = await this.prisma.$transaction([
      this.prisma.mileageRecord.create({
        data: {
          mileage: dto.mileage,
          note: dto.note,
          vehicleId,
          recordedById: userId,
        },
        include: { recordedBy: { select: { id: true, email: true, role: true } } },
      }),
      this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { mileage: dto.mileage },
      }),
    ])

    return record
  }

  async getMileageHistory(vehicleId: string) {
    await this.findOne(vehicleId)
    return this.prisma.mileageRecord.findMany({
      where: { vehicleId },
      orderBy: { recordedAt: 'desc' },
      include: { recordedBy: { select: { id: true, email: true, role: true } } },
    })
  }
}
