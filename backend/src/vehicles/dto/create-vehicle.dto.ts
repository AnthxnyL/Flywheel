import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateVehicleDto {
  @IsString()
  vin: string

  @IsString()
  brand: string

  @IsString()
  model: string

  @IsOptional()
  @IsInt()
  year?: number

  @IsOptional()
  @IsString()
  licensePlate?: string

  @IsInt()
  @Min(0)
  mileage: number

  @IsOptional()
  @IsString()
  driverId?: string
}
