import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { Response } from 'express'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from './email.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { CreateClientDto } from './dto/create-client.dto'
import { ActivateAccountDto } from './dto/activate-account.dto'

const BCRYPT_ROUNDS = 12

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (exists) throw new BadRequestException('Cet email est déjà utilisé')

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password,
        role: dto.role as Role,
        emailVerificationToken,
      },
    })

    await this.email.sendVerificationEmail(user.email, emailVerificationToken)

    return { message: 'Compte créé. Vérifiez votre email pour activer votre compte.' }
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect')

    if (!user.password) throw new UnauthorizedException('Compte non activé. Vérifiez votre email.')

    const valid = await bcrypt.compare(dto.password, user.password)
    if (!valid) throw new UnauthorizedException('Email ou mot de passe incorrect')

    if (!user.emailVerified) {
      throw new UnauthorizedException('Veuillez vérifier votre email avant de vous connecter')
    }

    const tokens = this.generateTokens(user.id, user.email, user.role)

    const isProd = process.env.NODE_ENV === 'production'
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      // cross-origin (Vercel → Render) requires SameSite=None + Secure in prod
      sameSite: isProd ? 'none' : 'strict',
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    })

    return {
      accessToken: tokens.accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    }
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Session expirée')
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      }) as { sub: string; email: string; role: string }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user) throw new UnauthorizedException()

      const { accessToken } = this.generateTokens(user.id, user.email, user.role as string)
      return { accessToken, user: { id: user.id, email: user.email, role: user.role } }
    } catch {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter')
    }
  }

  logout(res: Response) {
    res.clearCookie('refresh_token', { path: '/auth/refresh' })
    return { message: 'Déconnecté avec succès' }
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    })
    if (!user) throw new BadRequestException('Lien de vérification invalide ou expiré')

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerificationToken: null },
    })

    return { message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' }
  }

  // Called by a DEALER to create a client account and send an activation email
  async createClient(dto: CreateClientDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (exists) throw new BadRequestException('Un compte existe déjà pour cet email')

    const activationToken = crypto.randomBytes(32).toString('hex')

    await this.prisma.user.create({
      data: {
        email: dto.email,
        password: null,
        role: Role.DRIVER,
        emailVerificationToken: activationToken,
      },
    })

    await this.email.sendActivationEmail(dto.email, activationToken)

    return { message: `Lien d'activation envoyé à ${dto.email}` }
  }

  // Called when the client clicks the activation link and sets their password
  async activateAccount(dto: ActivateAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: dto.token },
    })
    if (!user) throw new BadRequestException("Lien d'activation invalide ou expiré")

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password, emailVerified: true, emailVerificationToken: null },
    })
    return { message: 'Compte activé avec succès. Vous pouvez maintenant vous connecter.' }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })

    // Always return success to avoid user enumeration
    if (!user) return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    })

    await this.email.sendPasswordResetEmail(user.email, token)

    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: dto.token },
    })

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré')
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password, passwordResetToken: null, passwordResetExpires: null },
    })
    return { message: 'Mot de passe réinitialisé avec succès.' }
  }

  async getClients() {
    return this.prisma.user.findMany({
      where: { role: Role.DRIVER },
      select: { id: true, email: true, emailVerified: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  private generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET') as string,
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES') as any,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET') as string,
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES') as any,
    })
    return { accessToken, refreshToken }
  }
}
