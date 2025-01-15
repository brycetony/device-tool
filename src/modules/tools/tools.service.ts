import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class ToolsService {
  // CRC-16/MODBUS 查找表
  private static readonly CRC16_MODBUS_TABLE: number[] = Array(256)
    .fill(0)
    .map((_, i) => {
      let crc = i;
      for (let j = 0; j < 8; j++) {
        crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
      }
      return crc;
    });

  // CRC-16/CCITT-FALSE 查找表
  private static readonly CRC16_CCITT_TABLE: number[] = Array(256)
    .fill(0)
    .map((_, i) => {
      let crc = i << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      }
      return (crc >> 8) & 0xff;
    });

  // CRC-32 查找表
  private static readonly CRC32_TABLE: number[] = Array(256)
    .fill(0)
    .map((_, i) => {
      let crc = i;
      for (let j = 0; j < 8; j++) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
      return crc >>> 0;
    });

  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('ToolsService');
  }

  /**
   * 十六进制字符串转换为字符串（支持中文）
   * @param hex 十六进制字符串
   * @returns 字符串
   */
  hexToAscii(hex: string): { text: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      // 将十六进制转换为 Buffer
      const bytes = Buffer.from(hex, 'hex');
      try {
        // 尝试以 UTF-8 解码
        const text = bytes.toString('utf8');
        this.logger.debug(`转换十六进制 ${hex} 为文本: ${text}`);
        return { text };
      } catch (error) {
        this.logger.error('十六进制转文本失败:', error.stack);
        // 如果 UTF-8 解码失败，则按字节显示
        let text = '';
        for (const byte of bytes) {
          if (byte >= 32 && byte <= 126) {
            text += String.fromCharCode(byte);
          } else {
            text += '.';
          }
        }
        this.logger.debug(`转换十六进制 ${hex} 为文本（不可打印字符用.表示）: ${text}`);
        return { text };
      }
    } catch (error) {
      this.logger.error('十六进制转文本失败:', error.stack);
      return { text: '', error: error.message };
    }
  }

  /**
   * 字符串转换为十六进制字符串（支持中文）
   * @param text 字符串
   * @returns 十六进制字符串
   */
  textToHex(text: string): { hex: string; error?: string } {
    try {
      // 将字符串转换为 UTF-8 编码的 Buffer
      const buffer = Buffer.from(text, 'utf8');
      // 将 Buffer 转换为十六进制字符串
      const hex = buffer.toString('hex').toUpperCase();

      this.logger.debug(`转换文本 ${text} 为十六进制: ${hex}`);
      return { hex };
    } catch (error) {
      this.logger.error('文本转十六进制失败:', error.stack);
      return { hex: '', error: error.message };
    }
  }

  /**
   * ASCII 字符串转换为十六进制字符串
   * @param ascii ASCII 字符串
   * @returns 十六进制字符串
   */
  asciiToHex(ascii: string): { hex: string; error?: string } {
    try {
      let hex = '';
      for (let i = 0; i < ascii.length; i++) {
        hex += ascii.charCodeAt(i).toString(16).padStart(2, '0');
      }

      this.logger.debug(`转换 ASCII ${ascii} 为十六进制: ${hex}`);
      return { hex: hex.toUpperCase() };
    } catch (error) {
      this.logger.error('ASCII 转十六进制失败:', error.stack);
      return { hex: '', error: error.message };
    }
  }

  /**
   * 格式化十六进制字符串
   * @param hex 十六进制字符串
   * @param bytesPerGroup 每组字节数
   * @param uppercase 是否大写
   * @returns 格式化后的十六进制字符串
   */
  formatHex(hex: string, bytesPerGroup: number = 2, uppercase: boolean = true): { formatted: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      // 格式化
      const bytes = hex.match(/.{2}/g) || [];
      const groups = [];
      for (let i = 0; i < bytes.length; i += bytesPerGroup) {
        groups.push(bytes.slice(i, i + bytesPerGroup).join(''));
      }

      const formatted = groups.join(' ');
      return { formatted: uppercase ? formatted.toUpperCase() : formatted.toLowerCase() };
    } catch (error) {
      this.logger.error('格式化十六进制失败:', error.stack);
      return { formatted: '', error: error.message };
    }
  }

  /**
   * 计算 CRC16-Modbus
   * @param hex 十六进制字符串
   * @returns CRC16 校验值（十六进制）
   */
  calculateCRC16(hex: string): { crc: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      let crc = 0xffff;
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        crc = (crc >> 8) ^ ToolsService.CRC16_MODBUS_TABLE[(crc ^ byte) & 0xff];
      }

      // 转换为4位十六进制字符串，低字节在前
      const result = (((crc & 0xff) << 8) | (crc >> 8)).toString(16).padStart(4, '0').toUpperCase();
      this.logger.debug(`计算 CRC16: ${hex} -> ${result}`);
      return { crc: result };
    } catch (error) {
      this.logger.error('计算 CRC16 失败:', error.stack);
      return { crc: '', error: error.message };
    }
  }

  /**
   * 计算校验和（按字节相加取低字节）
   * @param hex 十六进制字符串
   * @returns 校验和（十六进制）
   */
  calculateChecksum(hex: string): { checksum: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      let sum = 0;
      for (let i = 0; i < hex.length; i += 2) {
        sum += parseInt(hex.substr(i, 2), 16);
      }

      // 取低字节
      const checksum = (sum & 0xff).toString(16).padStart(2, '0').toUpperCase();
      this.logger.debug(`计算校验和: ${hex} -> ${checksum}`);
      return { checksum };
    } catch (error) {
      this.logger.error('计算校验和失败:', error.stack);
      return { checksum: '', error: error.message };
    }
  }

  /**
   * 计算异或校验
   * @param hex 十六进制字符串
   * @returns 异或校验值（十六进制）
   */
  calculateXOR(hex: string): { xor: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      let xor = 0;
      for (let i = 0; i < hex.length; i += 2) {
        xor ^= parseInt(hex.substr(i, 2), 16);
      }

      const result = xor.toString(16).padStart(2, '0').toUpperCase();
      this.logger.debug(`计算异或校验: ${hex} -> ${result}`);
      return { xor: result };
    } catch (error) {
      this.logger.error('计算异或校验失败:', error.stack);
      return { xor: '', error: error.message };
    }
  }

  /**
   * 十六进制转 Base64
   * @param hex 十六进制字符串
   * @returns Base64 字符串
   */
  hexToBase64(hex: string): { base64: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }

      const base64 = Buffer.from(bytes).toString('base64');
      this.logger.debug(`转换十六进制到 Base64: ${hex} -> ${base64}`);
      return { base64 };
    } catch (error) {
      this.logger.error('十六进制转 Base64 失败:', error.stack);
      return { base64: '', error: error.message };
    }
  }

  /**
   * Base64 转十六进制
   * @param base64 Base64 字符串
   * @returns 十六进制字符串
   */
  base64ToHex(base64: string): { hex: string; error?: string } {
    try {
      // 验证输入是否为有效的 Base64 字符串
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        throw new Error('无效的 Base64 字符串');
      }

      const bytes = Buffer.from(base64, 'base64');
      const hex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();

      this.logger.debug(`转换 Base64 到十六进制: ${base64} -> ${hex}`);
      return { hex };
    } catch (error) {
      this.logger.error('Base64 转十六进制失败:', error.stack);
      return { hex: '', error: error.message };
    }
  }

  /**
   * 计算 CRC-16/MODBUS
   * @param hex 十六进制字符串
   * @returns CRC16 校验值（十六进制）
   */
  calculateCRC16Modbus(hex: string): { crc: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      let crc = 0xffff;
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        crc = (crc >> 8) ^ ToolsService.CRC16_MODBUS_TABLE[(crc ^ byte) & 0xff];
      }

      // 转换为4位十六进制字符串，低字节在前
      const result = (((crc & 0xff) << 8) | (crc >> 8)).toString(16).padStart(4, '0').toUpperCase();
      this.logger.debug(`计算 CRC-16/MODBUS: ${hex} -> ${result}`);
      return { crc: result };
    } catch (error) {
      this.logger.error('计算 CRC-16/MODBUS 失败:', error.stack);
      return { crc: '', error: error.message };
    }
  }

  /**
   * 计算 CRC-16/CCITT-FALSE
   * @param hex 十六进制字符串
   * @returns CRC16 校验值（十六进制）
   */
  calculateCRC16CCITT(hex: string): { crc: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      let crc = 0xffff;
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        crc = ((crc << 8) & 0xff00) ^ ToolsService.CRC16_CCITT_TABLE[((crc >> 8) ^ byte) & 0xff];
      }

      const result = crc.toString(16).padStart(4, '0').toUpperCase();
      this.logger.debug(`计算 CRC-16/CCITT-FALSE: ${hex} -> ${result}`);
      return { crc: result };
    } catch (error) {
      this.logger.error('计算 CRC-16/CCITT-FALSE 失败:', error.stack);
      return { crc: '', error: error.message };
    }
  }

  /**
   * 计算 CRC-16/XMODEM
   * @param hex 十六进制字符串
   * @returns CRC16 校验值（十六进制）
   */
  calculateCRC16XMODEM(hex: string): { crc: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      let crc = 0x0000;
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        crc = ((crc << 8) & 0xff00) ^ ToolsService.CRC16_CCITT_TABLE[((crc >> 8) ^ byte) & 0xff];
      }

      const result = crc.toString(16).padStart(4, '0').toUpperCase();
      this.logger.debug(`计算 CRC-16/XMODEM: ${hex} -> ${result}`);
      return { crc: result };
    } catch (error) {
      this.logger.error('计算 CRC-16/XMODEM 失败:', error.stack);
      return { crc: '', error: error.message };
    }
  }

  /**
   * 计算 CRC-32
   * @param hex 十六进制字符串
   * @returns CRC32 校验值（十六进制）
   */
  calculateCRC32(hex: string): { crc: string; error?: string } {
    try {
      // 移除所有空格
      hex = hex.replace(/\s/g, '');
      // 验证输入是否为有效的十六进制字符串
      if (!/^[0-9A-Fa-f]*$/.test(hex)) {
        throw new Error('无效的十六进制字符串');
      }

      // 如果长度为奇数，补0
      if (hex.length % 2 !== 0) {
        hex = '0' + hex;
      }

      let crc = 0xffffffff;
      for (let i = 0; i < hex.length; i += 2) {
        const byte = parseInt(hex.substr(i, 2), 16);
        crc = (crc >>> 8) ^ ToolsService.CRC32_TABLE[(crc ^ byte) & 0xff];
      }

      crc = (crc ^ 0xffffffff) >>> 0;
      const result = crc.toString(16).padStart(8, '0').toUpperCase();
      this.logger.debug(`计算 CRC-32: ${hex} -> ${result}`);
      return { crc: result };
    } catch (error) {
      this.logger.error('计算 CRC-32 失败:', error.stack);
      return { crc: '', error: error.message };
    }
  }
}
