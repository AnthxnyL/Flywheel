import { IsOptional, IsString, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'

export class UploadInvoiceDto {
  @IsOptional()
  @IsString()
  label?: string

  @IsOptional()
  @IsString()
  invoiceDate?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number
}
