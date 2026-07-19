import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { MaintenancePlanService } from './maintenance-plan.service'
import { CreatePlanItemDto } from './dto/create-plan-item.dto'
import { UpdatePlanItemDto } from './dto/update-plan-item.dto'
import { MarkDoneDto } from './dto/mark-done.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('vehicles/:vehicleId/plan')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenancePlanController {
  constructor(private plan: MaintenancePlanService) {}

  @Get()
  @Roles('DEALER', 'DRIVER')
  findAll(@Param('vehicleId') vehicleId: string) {
    return this.plan.findAll(vehicleId)
  }

  @Post()
  @Roles('DEALER')
  create(@Param('vehicleId') vehicleId: string, @Body() dto: CreatePlanItemDto) {
    return this.plan.create(vehicleId, dto)
  }

  @Patch(':itemId')
  @Roles('DEALER')
  update(@Param('vehicleId') vehicleId: string, @Param('itemId') itemId: string, @Body() dto: UpdatePlanItemDto) {
    return this.plan.update(vehicleId, itemId, dto)
  }

  // Mark an operation as done — resets lastDoneKm/lastDoneDate to now
  @Post(':itemId/done')
  @HttpCode(200)
  @Roles('DEALER', 'DRIVER')
  markDone(@Param('vehicleId') vehicleId: string, @Param('itemId') itemId: string, @Body() dto: MarkDoneDto) {
    return this.plan.markDone(vehicleId, itemId, dto)
  }

  @Delete(':itemId')
  @HttpCode(204)
  @Roles('DEALER')
  remove(@Param('vehicleId') vehicleId: string, @Param('itemId') itemId: string) {
    return this.plan.remove(vehicleId, itemId)
  }
}
