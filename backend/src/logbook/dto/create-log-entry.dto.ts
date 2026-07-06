import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { LogEntryType } from '@prisma/client'

export class CreateLogEntryDto {
  @IsEnum(LogEntryType)
  type: LogEntryType

  @IsDateString()
  date: string

  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  mileageAtEvent?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @IsOptional()
  @IsString()
  documentUrl?: string
}
