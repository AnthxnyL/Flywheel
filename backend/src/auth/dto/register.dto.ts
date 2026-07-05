import { IsEmail, IsEnum, IsString, Matches, MinLength } from 'class-validator'
import { Role } from '@prisma/client'

export class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre',
  })
  password: string

  @IsEnum(Role)
  role: Role
}
