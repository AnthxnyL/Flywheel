import { Module } from '@nestjs/common'
import { VehiclesController } from './vehicles.controller'
import { VehiclesService } from './vehicles.service'
import { VinDecoderService } from './vin-decoder.service'

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService, VinDecoderService],
})
export class VehiclesModule {}
