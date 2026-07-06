import { IsString } from 'class-validator'

export class AssignVehicleDto {
  @IsString()
  driverId: string
}
