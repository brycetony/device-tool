import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ToolsService } from './tools.service';
import { HexInputDto, TextInputDto, AsciiInputDto, Base64InputDto, FormatHexInputDto } from './dto/tools.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('工具')
@Controller('tools')
@Roles('superadmin', 'admin', 'user')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post('hex2text')
  @ApiOperation({ summary: '十六进制转文本（支持中文）' })
  hexToText(@Body() dto: HexInputDto) {
    return this.toolsService.hexToAscii(dto.hex);
  }

  @Post('text2hex')
  @ApiOperation({ summary: '文本转十六进制（支持中文）' })
  textToHex(@Body() dto: TextInputDto) {
    return this.toolsService.textToHex(dto.text);
  }

  @Post('hex2ascii')
  @ApiOperation({ summary: '十六进制转 ASCII' })
  hexToAscii(@Body() dto: HexInputDto) {
    return this.toolsService.hexToAscii(dto.hex);
  }

  @Post('ascii2hex')
  @ApiOperation({ summary: 'ASCII 转十六进制' })
  asciiToHex(@Body() dto: AsciiInputDto) {
    return this.toolsService.asciiToHex(dto.ascii);
  }

  @Post('format-hex')
  @ApiOperation({ summary: '格式化十六进制字符串' })
  formatHex(@Body() dto: FormatHexInputDto) {
    return this.toolsService.formatHex(dto.hex, dto.bytesPerGroup, dto.uppercase);
  }

  @Post('crc16')
  @ApiOperation({ summary: '计算 CRC16-Modbus' })
  calculateCRC16(@Body() dto: HexInputDto) {
    return this.toolsService.calculateCRC16(dto.hex);
  }

  @Post('checksum')
  @ApiOperation({ summary: '计算校验和' })
  calculateChecksum(@Body() dto: HexInputDto) {
    return this.toolsService.calculateChecksum(dto.hex);
  }

  @Post('xor')
  @ApiOperation({ summary: '计算异或校验' })
  calculateXOR(@Body() dto: HexInputDto) {
    return this.toolsService.calculateXOR(dto.hex);
  }

  @Post('hex2base64')
  @ApiOperation({ summary: '十六进制转 Base64' })
  hexToBase64(@Body() dto: HexInputDto) {
    return this.toolsService.hexToBase64(dto.hex);
  }

  @Post('base642hex')
  @ApiOperation({ summary: 'Base64 转十六进制' })
  base64ToHex(@Body() dto: Base64InputDto) {
    return this.toolsService.base64ToHex(dto.base64);
  }

  @Post('crc16-modbus')
  @ApiOperation({ summary: '计算 CRC-16/MODBUS' })
  calculateCRC16Modbus(@Body() dto: HexInputDto) {
    return this.toolsService.calculateCRC16Modbus(dto.hex);
  }

  @Post('crc16-ccitt')
  @ApiOperation({ summary: '计算 CRC-16/CCITT-FALSE' })
  calculateCRC16CCITT(@Body() dto: HexInputDto) {
    return this.toolsService.calculateCRC16CCITT(dto.hex);
  }

  @Post('crc16-xmodem')
  @ApiOperation({ summary: '计算 CRC-16/XMODEM' })
  calculateCRC16XMODEM(@Body() dto: HexInputDto) {
    return this.toolsService.calculateCRC16XMODEM(dto.hex);
  }

  @Post('crc32')
  @ApiOperation({ summary: '计算 CRC-32' })
  calculateCRC32(@Body() dto: HexInputDto) {
    return this.toolsService.calculateCRC32(dto.hex);
  }
}
