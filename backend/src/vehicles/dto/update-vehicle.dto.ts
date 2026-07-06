import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsInt()
  year?: number

  @IsOptional()
  @IsString()
  licensePlate?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number
}
