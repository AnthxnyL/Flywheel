import { IsInt, IsOptional, IsDateString, Min } from 'class-validator'

export class MarkDoneDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  doneAtKm?: number

  @IsOptional()
  @IsDateString()
  doneAtDate?: string
}
