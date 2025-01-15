import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto, ResponseDeviceDto, UpdateDeviceDto } from './dto/device.dto';
import { CreateDeviceCommandDto, QueryDeviceCommandDto, ResponseDeviceCommandDto, UpdateDeviceCommandDto } from './dto/device-command.dto';
import { Device } from './schemas/device.schema';
import { DeviceCommand } from './schemas/device-command.schema';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { MongoIdParam } from './dto/param-validation.dto';
import { QueryDto } from '../../common/dto/common.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('设备管理')
@Controller('devices')
@Roles('superadmin', 'admin', 'user')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: '创建设备' })
  @Roles('superadmin', 'admin')
  async createDevice(@Body() createDeviceDto: CreateDeviceDto): Promise<Device> {
    return this.devicesService.createDevice(createDeviceDto);
  }

  @Post('copy')
  @ApiOperation({ summary: '复制设备' })
  @Roles('superadmin', 'admin')
  async copyDevice(@Body() copyDeviceDto: { deviceId: string }): Promise<Device> {
    return this.devicesService.copyDevice(copyDeviceDto.deviceId);
  }

  @Post('command')
  @ApiOperation({ summary: '创建设备命令' })
  @Roles('superadmin', 'admin')
  async createDeviceCommand(@Body() createDeviceCommandDto: CreateDeviceCommandDto): Promise<DeviceCommand> {
    return this.devicesService.createDeviceCommand(createDeviceCommandDto);
  }

  @Get('command/:id')
  @ApiOperation({ summary: '获取指定设备命令' })
  @ApiParam({ name: 'id', description: '设备命令ID' })
  async findDeviceCommandById(@Param() { id }: MongoIdParam): Promise<ResponseDeviceCommandDto> {
    return this.devicesService.findDeviceCommandById(id);
  }

  @Put('command')
  @ApiOperation({ summary: '更新设备命令' })
  @Roles('superadmin', 'admin')
  async updateDeviceCommand(@Body() updateDeviceCommandDto: UpdateDeviceCommandDto): Promise<DeviceCommand> {
    return this.devicesService.updateDeviceCommand(updateDeviceCommandDto);
  }

  @Delete('command/:id')
  @ApiOperation({ summary: '删除设备命令' })
  @ApiParam({ name: 'id', description: '设备命令ID' })
  @Roles('superadmin', 'admin')
  async deleteDeviceCommand(@Param() { id }: MongoIdParam): Promise<DeviceCommand> {
    return this.devicesService.deleteDeviceCommand(id);
  }

  @Get()
  @ApiOperation({ summary: '获取所有设备' })
  async findDevices(@Query() query: QueryDto): Promise<{ total: number; items: ResponseDeviceDto[] }> {
    return this.devicesService.findDevices(query);
  }

  @Get(':id/commands')
  @ApiOperation({ summary: '获取指定设备的所有命令' })
  @ApiParam({ name: 'id', description: '设备ID' })
  async findDeviceCommands(@Param() { id }: MongoIdParam, @Query() query: QueryDeviceCommandDto): Promise<{ total: number; items: ResponseDeviceCommandDto[] }> {
    return this.devicesService.findDeviceCommands(id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定设备' })
  @ApiParam({ name: 'id', description: '设备ID' })
  async findDeviceById(@Param() { id }: MongoIdParam): Promise<ResponseDeviceDto> {
    return this.devicesService.findDeviceById(id);
  }

  @Put()
  @ApiOperation({ summary: '更新设备' })
  @Roles('superadmin', 'admin')
  async updateDevice(@Body() updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    return this.devicesService.updateDevice(updateDeviceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除设备' })
  @ApiParam({ name: 'id', description: '设备ID' })
  @Roles('superadmin', 'admin')
  async deleteDevice(@Param() { id }: MongoIdParam): Promise<Device> {
    return this.devicesService.deleteDevice(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: '启动设备服务实例' })
  @ApiParam({ name: 'id', description: '设备ID' })
  async createDeviceInstance(@Param() { id }: MongoIdParam) {
    return this.devicesService.createDeviceInstance(id);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: '停止设备服务实例' })
  @ApiParam({ name: 'id', description: '设备ID' })
  async stopDeviceInstance(@Param() { id }: MongoIdParam) {
    return this.devicesService.stopDeviceInstance(id);
  }

  @Post(':id/send')
  @ApiOperation({ summary: '设备发送数据' })
  @ApiParam({ name: 'id', description: '设备ID' })
  async deviceSendData(@Param() { id }: MongoIdParam, @Body() data: string) {
    return this.devicesService.deviceSendData(id, data);
  }
}
