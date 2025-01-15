import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class HexInputDto {
  @ApiProperty({ description: '十六进制字符串' })
  @IsString({ message: '十六进制字符串必须是字符串' })
  @IsNotEmpty({ message: '十六进制字符串不能为空' })
  hex: string;
}

export class TextInputDto {
  @ApiProperty({ description: '文本字符串' })
  @IsString({ message: '文本字符串必须是字符串' })
  @IsNotEmpty({ message: '文本字符串不能为空' })
  text: string;
}

export class AsciiInputDto {
  @ApiProperty({ description: 'ASCII 字符串' })
  @IsString({ message: 'ASCII 字符串必须是字符串' })
  @IsNotEmpty({ message: 'ASCII 字符串不能为空' })
  ascii: string;
}

export class Base64InputDto {
  @ApiProperty({ description: 'Base64 字符串' })
  @IsString({ message: 'Base64 字符串必须是字符串' })
  @IsNotEmpty({ message: 'Base64 字符串不能为空' })
  base64: string;
}

export class FormatHexInputDto {
  @ApiProperty({ description: '十六进制字符串' })
  @IsString({ message: '十六进制字符串必须是字符串' })
  @IsNotEmpty({ message: '十六进制字符串不能为空' })
  hex: string;

  @ApiProperty({ description: '每组字节数', required: false, default: 2 })
  @IsNumber({}, { message: '每组字节数必须是数字' })
  @IsOptional()
  bytesPerGroup?: number;

  @ApiProperty({ description: '是否大写', required: false, default: true })
  @IsBoolean({ message: '是否大写必须是布尔值' })
  @IsOptional()
  uppercase?: boolean;
}
