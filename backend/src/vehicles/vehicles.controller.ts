import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { VehiclesService } from './vehicles.service'
import { VinDecoderService } from './vin-decoder.service'
import { CreateVehicleDto } from './dto/create-vehicle.dto'
import { UpdateVehicleDto } from './dto/update-vehicle.dto'
import { AssignVehicleDto } from './dto/assign-vehicle.dto'
import { CreateMileageRecordDto } from './dto/create-mileage-record.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

type JwtUser = { id: string; email: string; role: string }

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(
    private vehicles: VehiclesService,
    private vinDecoder: VinDecoderService,
  ) {}

  // DEALER: decode a VIN before creating the vehicle
  @Get('decode-vin/:vin')
  @UseGuards(RolesGuard)
  @Roles('DEALER')
  decodeVin(@Param('vin') vin: string) {
    return this.vinDecoder.decode(vin)
  }

  // DEALER: list all vehicles in the fleet
  @Get()
  @UseGuards(RolesGuard)
  @Roles('DEALER')
  findAll() {
    return this.vehicles.findAll()
  }

  // DRIVER: get own vehicles
  @Get('mine')
  @UseGuards(RolesGuard)
  @Roles('DRIVER')
  findMine(@CurrentUser() user: JwtUser) {
    return this.vehicles.findByDriver(user.id)
  }

  // DEALER: get vehicle detail
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('DEALER')
  findOne(@Param('id') id: string) {
    return this.vehicles.findOne(id)
  }

  // DEALER: create vehicle
  @Post()
  @UseGuards(RolesGuard)
  @Roles('DEALER')
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: JwtUser) {
    return this.vehicles.create(dto, user.id)
  }

  // DEALER: update vehicle info
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('DEALER')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(id, dto)
  }

  // DEALER: assign vehicle to a driver
  @Post(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('DEALER')
  assign(@Param('id') id: string, @Body() dto: AssignVehicleDto) {
    return this.vehicles.assign(id, dto.driverId)
  }

  // DEALER: unassign vehicle from driver
  @Delete(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('DEALER')
  unassign(@Param('id') id: string) {
    return this.vehicles.unassign(id)
  }

  // DEALER or DRIVER: add a mileage record
  @Post(':id/mileage')
  @UseGuards(RolesGuard)
  @Roles('DEALER', 'DRIVER')
  addMileageRecord(
    @Param('id') id: string,
    @Body() dto: CreateMileageRecordDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.vehicles.addMileageRecord(id, dto, user.id)
  }

  // DEALER: full mileage history
  @Get(':id/mileage')
  @UseGuards(RolesGuard)
  @Roles('DEALER')
  getMileageHistory(@Param('id') id: string) {
    return this.vehicles.getMileageHistory(id)
  }
}
