import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'
import type { Response } from 'express'
import * as fs from 'fs'
import { InvoicesService } from './invoices.service'
import { UploadInvoiceDto } from './dto/upload-invoice.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

type JwtUser = { id: string; email: string; role: string }

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]

const storage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname)
    cb(null, `${randomUUID()}${ext}`)
  },
})

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private invoices: InvoicesService) {}

  // DRIVER or DEALER: upload a file for a vehicle
  @Post('vehicle/:vehicleId')
  @UseGuards(RolesGuard)
  @Roles('DRIVER', 'DEALER')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
          cb(null, true)
        } else {
          cb(new BadRequestException('Format non supporté. Utilisez JPG, PNG, WebP ou PDF.'), false)
        }
      },
    }),
  )
  upload(
    @Param('vehicleId') vehicleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadInvoiceDto,
    @CurrentUser() user: JwtUser,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni.')
    return this.invoices.create(vehicleId, file, dto, user.id)
  }

  // DRIVER or DEALER: list invoices for a vehicle
  @Get('vehicle/:vehicleId')
  @UseGuards(RolesGuard)
  @Roles('DRIVER', 'DEALER')
  findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.invoices.findByVehicle(vehicleId)
  }

  // DRIVER or DEALER: stream / download a file
  @Get(':id/file')
  @UseGuards(RolesGuard)
  @Roles('DRIVER', 'DEALER')
  async serveFile(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoices.findOne(id)
    const filePath = join(process.cwd(), 'uploads', invoice.storedName)

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Fichier introuvable sur le serveur.' })
      return
    }

    res.setHeader('Content-Type', invoice.mimeType)
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(invoice.filename)}"`,
    )
    fs.createReadStream(filePath).pipe(res)
  }

  // DRIVER or DEALER: delete
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('DRIVER', 'DEALER')
  delete(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.invoices.delete(id, user.id, user.role)
  }
}
