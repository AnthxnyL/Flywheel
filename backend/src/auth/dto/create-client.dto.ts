import { IsEmail, IsOptional, IsString } from 'class-validator'

export class CreateClientDto {
  @IsEmail()
  email: string

  @IsString()
  @IsOptional()
  firstName?: string

  @IsString()
  @IsOptional()
  lastName?: string
}
