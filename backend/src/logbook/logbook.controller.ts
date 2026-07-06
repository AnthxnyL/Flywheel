import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common'
import { LogbookService } from './logbook.service'
import { CreateLogEntryDto } from './dto/create-log-entry.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

type JwtUser = { id: string; email: string; role: string }

@Controller('vehicles/:vehicleId/logbook')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogbookController {
  constructor(private logbook: LogbookService) {}

  // Full timeline — DEALER sees all; DRIVER sees their own vehicle
  @Get()
  @Roles('DEALER', 'DRIVER')
  getTimeline(@Param('vehicleId') vehicleId: string) {
    return this.logbook.getTimeline(vehicleId)
  }

  // Add a manual entry — DEALER only
  @Post()
  @Roles('DEALER')
  addEntry(
    @Param('vehicleId') vehicleId: string,
    @Body() dto: CreateLogEntryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.logbook.addEntry(vehicleId, dto, user.id)
  }

  // Delete a manual entry — DEALER only (raw entryId, not prefixed)
  @Delete(':entryId')
  @HttpCode(204)
  @Roles('DEALER')
  removeEntry(
    @Param('vehicleId') vehicleId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.logbook.removeEntry(vehicleId, entryId, user.id, user.role)
  }
}
