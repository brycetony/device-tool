import { IsString, IsNotEmpty, IsBoolean, IsNumber, Min, IsArray, ValidateNested, Length, Matches, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class CommandParamDto {
  @ApiProperty({ description: '参数名称', example: '温度' })
  @IsString({ message: '参数名称必须是字符串' })
  @IsNotEmpty({ message: '参数名称不能为空' })
  @Length(1, 20, { message: '参数名称长度必须在1-20个字符之间' })
  @Expose()
  paramName: string;

  @ApiProperty({ description: '参数类型', example: 'string' })
  @IsString({ message: '参数类型必须是字符串' })
  @IsNotEmpty({ message: '参数类型不能为空' })
  @Matches(/^(string|number|boolean)$/, { message: '参数类型必须是：string、number、boolean之一' })
  @Expose()
  paramType: string;

  @ApiProperty({ description: '参数键名', example: 'temperature' })
  @IsString({ message: '参数键名必须是字符串' })
  @IsNotEmpty({ message: '参数键名不能为空' })
  @Length(1, 30, { message: '参数键名长度必须在1-30个字符之间' })
  @Expose()
  paramKey: string;

  @ApiProperty({ description: '参数标签', example: '温度值' })
  @IsString({ message: '参数标签必须是字符串' })
  @IsNotEmpty({ message: '参数标签不能为空' })
  @Length(1, 20, { message: '参数标签长度必须在1-20个字符之间' })
  @Expose()
  paramLabel: string;

  @ApiProperty({ description: '参数长度', example: 1 })
  @IsNumber({}, { message: '参数长度必须是数字' })
  @IsNotEmpty({ message: '参数长度不能为空' })
  @Min(1, { message: '参数长度必须大于等于1' })
  @Expose()
  paramLength: number;

  @ApiProperty({ description: '参数值', example: '100' })
  @IsString({ message: '参数值必须是字符串' })
  @IsOptional()
  @Expose()
  paramValue?: string;

  @ApiProperty({ description: '是否唯一', example: true })
  @IsBoolean({ message: '是否唯一必须是布尔值' })
  @IsOptional()
  @Expose()
  isUnique?: boolean;
}

export class CreateDeviceCommandDto {
  @ApiProperty({ description: '设备ID', example: '507f1f77bcf86cd799439011' })
  @IsString({ message: '设备ID必须是字符串' })
  @IsNotEmpty({ message: '设备ID不能为空' })
  @Matches(/^[0-9a-fA-F]{24}$/, { message: '设备ID格式不正确' })
  @Expose()
  deviceId: string;

  @ApiProperty({ description: '命令名称', example: '读取温度' })
  @IsString({ message: '命令名称必须是字符串' })
  @IsNotEmpty({ message: '命令名称不能为空' })
  @Length(2, 50, { message: '命令名称长度必须在2-50个字符之间' })
  @Expose()
  commandName: string;

  @ApiProperty({ description: '命令类型', example: 'GET' })
  @IsString({ message: '命令类型必须是字符串' })
  @IsNotEmpty({ message: '命令类型不能为空' })
  @Matches(/^(GET|SET)$/, { message: '命令类型必须是：GET、SET之一' })
  @Expose()
  commandType: string;

  @ApiProperty({ description: '码流类型', example: 'ASCII' })
  @IsString({ message: '码流类型必须是字符串' })
  @IsNotEmpty({ message: '码流类型不能为空' })
  @Matches(/^(ASCII|HEX)$/, { message: '码流类型必须是：ASCII、HEX之一' })
  @Expose()
  streamType: string;

  @ApiProperty({ description: '请求码流', example: '01 03 00 00 00 01 84 0A' })
  @IsString({ message: '请求码流必须是字符串' })
  @IsNotEmpty({ message: '请求码流不能为空' })
  @Expose()
  reqStream: string;

  @ApiProperty({ description: '响应码流', example: '01 03 02 00 00 B8 44' })
  @IsString({ message: '响应码流必须是字符串' })
  @IsNotEmpty({ message: '响应码流不能为空' })
  @Expose()
  resStream: string;

  @ApiProperty({ description: '存储键', example: 'temperature' })
  @IsString({ message: '存储键必须是字符串' })
  @Expose()
  @IsOptional()
  storeKey?: string;

  @ApiProperty({ description: '参数列表', type: [CommandParamDto] })
  @IsArray({ message: '参数列表必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => CommandParamDto)
  @Expose()
  @IsOptional()
  params?: CommandParamDto[];
}

export class UpdateDeviceCommandDto extends CreateDeviceCommandDto {
  @ApiProperty({ description: '命令ID', example: '507f1f77bcf86cd799439011' })
  @IsString({ message: '命令ID必须是字符串' })
  @IsNotEmpty({ message: '命令ID不能为空' })
  @Matches(/^[0-9a-fA-F]{24}$/, { message: '命令ID格式不正确' })
  _id: string;
}

export class QueryDeviceCommandDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '搜索关键字' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class ResponseDeviceCommandDto extends CreateDeviceCommandDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: string;

  @Expose()
  @Transform(({ obj }) => obj.deviceId)
  deviceId: string;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;
}
