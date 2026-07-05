import { IsString, Matches, MinLength } from 'class-validator'

export class ActivateAccountDto {
  @IsString()
  token: string

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre',
  })
  password: string
}
