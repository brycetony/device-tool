import { IsString, IsNotEmpty, Length, Matches, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class CreateDeviceDto {
  @ApiProperty({ description: '设备名称', example: '测试设备' })
  @IsString({ message: '设备名称必须是字符串' })
  @IsNotEmpty({ message: '设备名称不能为空' })
  @Length(2, 50, { message: '设备名称长度必须在2-50个字符之间' })
  @Expose()
  deviceName: string;

  @ApiProperty({ description: '设备类型', example: 'TYPE-A' })
  @IsString({ message: '设备类型必须是字符串' })
  @IsNotEmpty({ message: '设备类型不能为空' })
  @Length(2, 20, { message: '设备类型长度必须在2-20个字符之间' })
  @Expose()
  deviceType: string;

  @ApiProperty({ description: '协议', example: 'TCP' })
  @IsString({ message: '协议必须是字符串' })
  @IsNotEmpty({ message: '协议不能为空' })
  @Matches(/^(TCPServer|UDPServer|TCPClient|UDPClient|Modbus|Telnet|HTTP)$/, {
    message: '协议必须是：TCPServer、UDPServer、TCPClient、UDPClient、Modbus、Telnet、HTTP之一',
  })
  @Expose()
  protocol: string;

  @ApiProperty({ description: '设备端口', example: '3000' })
  @IsNumber({}, { message: '设备端口必须是数字' })
  @IsNotEmpty({ message: '设备端口不能为空' })
  @Min(1, { message: '设备端口必须大于0' })
  @Max(65535, { message: '设备端口不能超过65535' })
  @Expose()
  devicePort: number;
}

export class UpdateDeviceDto extends CreateDeviceDto {
  @ApiProperty({ description: '设备ID', example: '666666666666666666666666' })
  @IsString({ message: '设备ID必须是字符串' })
  @IsNotEmpty({ message: '设备ID不能为空' })
  _id: string;

  @IsOptional()
  deviceStatus?: number;
}

export class ResponseDeviceDto extends CreateDeviceDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: string;

  @Expose()
  deviceStatus?: string; // 设备状态 0: 未启动 1: 已启动 2: 已停止
}
