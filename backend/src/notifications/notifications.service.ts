import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import * as webpush from 'web-push'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../auth/email.service'
import { SaveSubscriptionDto } from './dto/save-subscription.dto'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'

// Days-before thresholds that map to user preference flags
const THRESHOLDS = [
  { days: 30, flag: 'remindJ30' as const },
  { days: 7,  flag: 'remindJ7'  as const },
  { days: 1,  flag: 'remindJ1'  as const },
]

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {
    webpush.setVapidDetails(
      config.get<string>('VAPID_SUBJECT') ?? 'mailto:noreply@flywheel.app',
      config.get<string>('VAPID_PUBLIC_KEY')!,
      config.get<string>('VAPID_PRIVATE_KEY')!,
    )
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  async getPreferences(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } })
    if (pref) return pref
    // Create with defaults on first access
    return this.prisma.notificationPreference.create({
      data: { userId, emailEnabled: true, pushEnabled: false, remindJ30: true, remindJ7: true, remindJ1: true },
    })
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        emailEnabled: dto.emailEnabled ?? true,
        pushEnabled:  dto.pushEnabled  ?? false,
        remindJ30:    dto.remindJ30    ?? true,
        remindJ7:     dto.remindJ7     ?? true,
        remindJ1:     dto.remindJ1     ?? true,
      },
    })
  }

  // ── Push subscriptions ─────────────────────────────────────────────────────

  getVapidPublicKey() {
    return { publicKey: this.config.get<string>('VAPID_PUBLIC_KEY') }
  }

  async saveSubscription(userId: string, dto: SaveSubscriptionDto) {
    return this.prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: dto.endpoint } },
      update: { p256dh: dto.p256dh, auth: dto.auth },
      create: { userId, endpoint: dto.endpoint, p256dh: dto.p256dh, auth: dto.auth },
    })
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } })
  }

  // ── Cron: daily at 08:00 ───────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runDailyReminders() {
    this.logger.log('Running daily maintenance reminders…')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Load all plan items that have a nextDueDate
    const items = await this.prisma.maintenancePlanItem.findMany({
      where: { intervalMonths: { not: null } },
      include: {
        vehicle: {
          include: {
            driver: {
              include: {
                notificationPreference: true,
                pushSubscriptions: true,
              },
            },
          },
        },
      },
    })

    for (const item of items) {
      const driver = item.vehicle.driver
      if (!driver) continue

      const prefs = driver.notificationPreference
      if (!prefs) continue
      if (!prefs.emailEnabled && !prefs.pushEnabled) continue

      // Compute nextDueDate from lastDoneDate + intervalMonths
      if (!item.intervalMonths) continue
      const base = item.lastDoneDate ? new Date(item.lastDoneDate) : item.createdAt
      const nextDue = new Date(base)
      nextDue.setMonth(nextDue.getMonth() + item.intervalMonths)
      nextDue.setHours(0, 0, 0, 0)

      const diffDays = Math.round((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      const threshold = THRESHOLDS.find(t => t.days === diffDays)
      if (!threshold) continue
      if (!prefs[threshold.flag]) continue

      const label = `J-${threshold.days}`
      const dueStr = nextDue.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const vehicleLabel = `${item.vehicle.brand} ${item.vehicle.model}`

      this.logger.log(`Sending ${label} reminder for "${item.operationType}" on ${vehicleLabel} to ${driver.email}`)

      if (prefs.emailEnabled) {
        await this.sendReminderEmail(driver.email, item.operationType, vehicleLabel, dueStr, diffDays)
      }

      if (prefs.pushEnabled && driver.pushSubscriptions.length > 0) {
        await this.sendPushNotifications(
          driver.pushSubscriptions,
          item.operationType,
          vehicleLabel,
          dueStr,
          diffDays,
        )
      }
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async sendReminderEmail(
    to: string,
    operation: string,
    vehicle: string,
    dueDate: string,
    daysLeft: number,
  ) {
    const urgencyColor = daysLeft === 1 ? '#ef4444' : daysLeft === 7 ? '#f59e0b' : '#2563eb'
    const urgencyText  = daysLeft === 1 ? 'demain !' : daysLeft === 7 ? 'dans 7 jours' : 'dans 30 jours'
    const appUrl = this.config.get('APP_URL')

    await this.email['send'](
      to,
      `Rappel entretien ${urgencyText} — ${operation}`,
      `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <div style="background:${urgencyColor};padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Entretien à prévoir ${urgencyText}</h2>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px">Bonjour,</p>
          <p style="margin:0 0 16px">Un entretien est prévu <strong>${urgencyText}</strong> pour votre véhicule :</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:40%">Véhicule</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0">${vehicle}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600">Opération</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0">${operation}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600">Date prévue</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0">${dueDate}</td>
            </tr>
          </table>
          <a href="${appUrl}/app/dashboard"
             style="background:${urgencyColor};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
            Voir mon tableau de bord
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Vous recevez cet email car vous avez activé les rappels d'entretien.<br>
            Gérez vos préférences depuis votre tableau de bord.
          </p>
        </div>
      </div>
      `,
    )
  }

  private async sendPushNotifications(
    subscriptions: { endpoint: string; p256dh: string; auth: string; id: string }[],
    operation: string,
    vehicle: string,
    dueDate: string,
    daysLeft: number,
  ) {
    const urgencyText = daysLeft === 1 ? 'demain !' : daysLeft === 7 ? 'dans 7 jours' : 'dans 30 jours'
    const payload = JSON.stringify({
      title: `Entretien ${urgencyText}`,
      body: `${operation} — ${vehicle} — prévu le ${dueDate}`,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      url: '/app/dashboard',
    })

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      } catch (err: unknown) {
        // Subscription expired → clean it up
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null)
        } else {
          this.logger.error('Push send failed', err)
        }
      }
    }
  }
}
