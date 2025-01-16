import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Device } from './device.schema';

export type DeviceCommandDocument = DeviceCommand & Document;

@Schema()
export class CommandParam {
  @Prop({ required: true })
  paramName: string;

  @Prop({ required: true })
  paramType: string;

  @Prop({ required: true })
  paramKey: string;

  @Prop({ required: true })
  paramLabel: string;

  @Prop({ required: true })
  paramLength: number;

  @Prop()
  paramValue: string;

  @Prop()
  isUnique: boolean;
}

@Schema()
export class DeviceCommand {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Device', required: true })
  deviceId: Device;

  @Prop({ required: true })
  commandName: string;

  @Prop({ required: true })
  commandType: string;

  @Prop({ required: true })
  streamType: string;

  @Prop({ required: true })
  reqStream: string;

  @Prop()
  resStream?: string;

  @Prop()
  storeKey?: string;

  @Prop({ type: [CommandParam], required: true })
  params: CommandParam[];
}

export const DeviceCommandSchema = SchemaFactory.createForClass(DeviceCommand);
