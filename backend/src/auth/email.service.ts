import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly resend: Resend
  private readonly from: string

  constructor(private config: ConfigService) {
    this.resend = new Resend(config.get('RESEND_API_KEY'))
    this.from = config.get('SMTP_FROM') ?? 'noreply@flywheel.app'
  }

  async sendVerificationEmail(to: string, token: string) {
    const appUrl = this.config.get('APP_URL')
    const link = `${appUrl}/verify-email?token=${token}`

    await this.send(to, 'Vérifiez votre adresse email — Flywheel', `
      <h2>Bienvenue sur Flywheel</h2>
      <p>Cliquez sur le lien ci-dessous pour activer votre compte :</p>
      <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        Vérifier mon email
      </a>
      <p style="color:#64748b;margin-top:16px">Ce lien expire dans 24h.</p>
    `)
  }

  async sendActivationEmail(to: string, token: string) {
    const appUrl = this.config.get('APP_URL')
    const link = `${appUrl}/activate?token=${token}`

    await this.send(to, 'Activez votre compte Flywheel', `
      <h2>Bienvenue sur Flywheel</h2>
      <p>Votre concessionnaire a créé un espace pour vous. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
      <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">
        Activer mon compte
      </a>
      <p style="color:#64748b;margin-top:8px">Ce lien est valable 7 jours.</p>
    `)
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const appUrl = this.config.get('APP_URL')
    const link = `${appUrl}/reset-password?token=${token}`

    await this.send(to, 'Réinitialisation de mot de passe — Flywheel', `
      <h2>Réinitialiser votre mot de passe</h2>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
        Réinitialiser le mot de passe
      </a>
      <p style="color:#64748b;margin-top:16px">Ce lien expire dans 1h. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `)
  }

  private async send(to: string, subject: string, html: string) {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    })
    if (error) {
      this.logger.error(`Failed to send email to ${to}: ${JSON.stringify(error)}`)
    } else {
      this.logger.log(`Email sent to ${to}: ${subject}`)
    }
  }
}
