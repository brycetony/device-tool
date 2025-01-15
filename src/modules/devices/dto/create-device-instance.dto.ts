import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeviceInstanceDto {
  @ApiProperty({ description: '设备ID', example: '507f1f77bcf86cd799439011' })
  @IsString({ message: '设备ID必须是字符串' })
  @IsNotEmpty({ message: '设备ID不能为空' })
  deviceId: string;

  @ApiProperty({ description: '端口号', example: 502, required: false })
  @IsNumber({}, { message: '端口号必须是数字' })
  @Min(1, { message: '端口号必须大于0' })
  @Max(65535, { message: '端口号不能超过65535' })
  port?: number;

  @ApiProperty({ description: 'IP地址', example: '127.0.0.1', required: false })
  @IsString({ message: 'IP地址必须是字符串' })
  ip?: string;

  @ApiProperty({ description: '波特率', example: 9600, required: false })
  @IsNumber({}, { message: '波特率必须是数字' })
  @Min(1200, { message: '波特率必须大于1200' })
  baudRate?: number;
}
