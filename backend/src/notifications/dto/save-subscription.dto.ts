import { IsString } from 'class-validator'

export class SaveSubscriptionDto {
  @IsString()
  endpoint: string

  @IsString()
  p256dh: string

  @IsString()
  auth: string
}
