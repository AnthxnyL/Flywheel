import { Body, Controller, Delete, Get, HttpCode, Post, Put, UseGuards } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { SaveSubscriptionDto } from './dto/save-subscription.dto'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

type JwtUser = { id: string; email: string; role: string }

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  // VAPID public key — needed by frontend to subscribe
  @Get('vapid-public-key')
  getVapidPublicKey() {
    return this.svc.getVapidPublicKey()
  }

  // Get current user's notification preferences
  @Get('preferences')
  getPreferences(@CurrentUser() user: JwtUser) {
    return this.svc.getPreferences(user.id)
  }

  // Update current user's notification preferences
  @Put('preferences')
  updatePreferences(@CurrentUser() user: JwtUser, @Body() dto: UpdatePreferencesDto) {
    return this.svc.updatePreferences(user.id, dto)
  }

  // Save a Web Push subscription (browser sends this after user grants permission)
  @Post('push-subscription')
  saveSubscription(@CurrentUser() user: JwtUser, @Body() dto: SaveSubscriptionDto) {
    return this.svc.saveSubscription(user.id, dto)
  }

  // Remove subscription (user revokes push permission)
  @Delete('push-subscription')
  @HttpCode(204)
  removeSubscription(@CurrentUser() user: JwtUser, @Body() dto: { endpoint: string }) {
    return this.svc.removeSubscription(user.id, dto.endpoint)
  }
}
