import { IsInt, IsOptional, IsString, Min, IsDateString } from 'class-validator'

export class UpdatePlanItemDto {
  @IsOptional()
  @IsString()
  operationType?: string

  @IsOptional()
  @IsDateString()
  dueDate?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalKm?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalMonths?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  lastDoneKm?: number

  @IsOptional()
  @IsDateString()
  lastDoneDate?: string

  @IsOptional()
  @IsString()
  notes?: string
}
