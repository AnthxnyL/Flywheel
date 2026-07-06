import { IsBoolean, IsOptional } from 'class-validator'

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  remindJ30?: boolean

  @IsOptional()
  @IsBoolean()
  remindJ7?: boolean

  @IsOptional()
  @IsBoolean()
  remindJ1?: boolean
}
