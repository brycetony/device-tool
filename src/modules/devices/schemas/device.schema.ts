import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeviceDocument = Device & Document;

@Schema()
export class Device {
  @Prop({ required: true })
  deviceName: string;

  @Prop({ required: true })
  deviceType: string;

  @Prop({ required: true })
  protocol: string;

  @Prop({ required: true })
  devicePort: number;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
