import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device, DeviceSchema } from './schemas/device.schema';
import { DeviceCommand, DeviceCommandSchema } from './schemas/device-command.schema';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
      { name: DeviceCommand.name, schema: DeviceCommandSchema },
    ]),
  ],
  controllers: [DevicesController],
  providers: [DevicesService, WebsocketGateway],
})
export class DevicesModule {}
