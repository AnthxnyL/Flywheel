import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { CreateClientDto } from './dto/create-client.dto'
import { ActivateAccountDto } from './dto/activate-account.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { Roles } from './decorators/roles.decorator'
import { CurrentUser } from './decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res)
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    return this.auth.logout(res)
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() req: Request) {
    return this.auth.refresh(req.cookies?.refresh_token)
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.auth.verifyEmail(token)
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto)
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto)
  }

  // Dealer creates a client account and triggers an activation email
  @Post('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEALER')
  createClient(@Body() dto: CreateClientDto) {
    return this.auth.createClient(dto)
  }

  // Client activates their account by setting a password via the emailed link
  @Post('activate')
  @HttpCode(200)
  activateAccount(@Body() dto: ActivateAccountDto) {
    return this.auth.activateAccount(dto)
  }

  // DEALER: list all driver accounts
  @Get('clients')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DEALER')
  getClients() {
    return this.auth.getClients()
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: string; email: string; role: string }) {
    return user
  }
}
