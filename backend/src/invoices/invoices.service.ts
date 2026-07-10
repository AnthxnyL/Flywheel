import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UploadInvoiceDto } from './dto/upload-invoice.dto'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(
    vehicleId: string,
    file: Express.Multer.File,
    dto: UploadInvoiceDto,
    uploadedById: string,
  ) {
    // Verify vehicle exists and driver owns it (or is DEALER — checked at controller level)
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) throw new NotFoundException('Véhicule introuvable.')

    return this.prisma.invoice.create({
      data: {
        vehicleId,
        uploadedById,
        label: dto.label ?? null,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
        amount: dto.amount ?? null,
        filename: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      },
    })
  }

  async findByVehicle(vehicleId: string) {
    return this.prisma.invoice.findMany({
      where: { vehicleId },
      include: { uploadedBy: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } })
    if (!invoice) throw new NotFoundException('Facture introuvable.')
    return invoice
  }

  async delete(id: string, requesterId: string, requesterRole: string) {
    const invoice = await this.findOne(id)

    // DEALER can delete any invoice; DRIVER can only delete their own
    if (requesterRole !== 'DEALER' && invoice.uploadedById !== requesterId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer cette facture.')
    }

    const filePath = path.join(process.cwd(), 'uploads', invoice.storedName)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    return this.prisma.invoice.delete({ where: { id } })
  }
}
