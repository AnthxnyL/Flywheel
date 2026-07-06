import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [AuthModule], // re-use EmailService
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
