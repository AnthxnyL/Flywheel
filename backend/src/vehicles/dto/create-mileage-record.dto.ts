import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateMileageRecordDto {
  @IsInt()
  @Min(0)
  mileage: number

  @IsOptional()
  @IsString()
  note?: string
}
