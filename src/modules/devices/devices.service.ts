import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomLoggerService } from '../logger/logger.service';
import { Device, DeviceDocument } from './schemas/device.schema';
import { DeviceCommand, DeviceCommandDocument } from './schemas/device-command.schema';
import { CreateDeviceDto, ResponseDeviceDto, UpdateDeviceDto } from './dto/device.dto';
import { CreateDeviceCommandDto, QueryDeviceCommandDto, ResponseDeviceCommandDto, UpdateDeviceCommandDto } from './dto/device-command.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { QueryDto } from '../../common/dto/common.dto';

import * as net from 'net';
import * as dgram from 'dgram';
// import ModbusRTU from 'modbus-serial';
import { customPlainToClass } from '../../common/utils/transformer';

@Injectable()
export class DevicesService {
  private deviceInstances: Map<string, any> = new Map();
  private storeData: Map<string, any> = new Map();
  private sockets: Map<string, any> = new Map();

  constructor(
    private readonly logger: CustomLoggerService,
    private readonly wsGateway: WebsocketGateway,
    @InjectModel(Device.name)
    private deviceModel: Model<DeviceDocument>,
    @InjectModel(DeviceCommand.name)
    private deviceCommandModel: Model<DeviceCommandDocument>
  ) {
    this.logger.setContext(Device.name);
    this.logger.log('DevicesService 已启动');
  }

  async createDevice(createDeviceDto: CreateDeviceDto): Promise<Device> {
    const createdDevice = new this.deviceModel(createDeviceDto);
    return createdDevice.save();
  }

  async copyDevice(deviceId: string): Promise<Device> {
    const device = await this.deviceModel.findById(deviceId);
    if (!device) {
      throw new NotFoundException('设备不存在');
    }
    const deviceName = `${device.deviceName}-copy`;
    const devicePort = device.devicePort + 1;
    console.log('device: ', device);
    const insertDevice = customPlainToClass(CreateDeviceDto, device.toObject());
    const newDevice = await this.deviceModel.create({ ...insertDevice, deviceName, devicePort });
    // 复制设备命令
    const deviceCommands = await this.deviceCommandModel.find({ deviceId });
    await this.deviceCommandModel.insertMany(deviceCommands.map(command => ({ ...customPlainToClass(CreateDeviceCommandDto, command.toObject()), deviceId: newDevice._id })));
    return newDevice;
  }

  async createDeviceCommand(createDeviceCommandDto: CreateDeviceCommandDto): Promise<DeviceCommand> {
    const createdCommand = new this.deviceCommandModel(createDeviceCommandDto);
    return createdCommand.save();
  }

  async updateDevice(updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const { _id, ...rest } = updateDeviceDto;
    const existingDevice = await this.deviceModel.findById(_id);
    if (!existingDevice) {
      throw new NotFoundException(`Device with id ${_id} not found`);
    }
    return this.deviceModel.findByIdAndUpdate(_id, rest, {
      new: true,
    });
  }

  async updateDeviceCommand(updateDeviceCommandDto: UpdateDeviceCommandDto): Promise<DeviceCommand> {
    const { _id, ...rest } = updateDeviceCommandDto;
    const existingCommand = await this.deviceCommandModel.findById(_id);
    if (!existingCommand) {
      throw new NotFoundException(`DeviceCommand with id ${_id} not found`);
    }
    return this.deviceCommandModel.findByIdAndUpdate(_id, rest, { new: true });
  }

  async deleteDevice(id: string): Promise<Device> {
    return this.deviceModel.findByIdAndDelete(id);
  }

  async deleteDeviceCommand(id: string): Promise<DeviceCommand> {
    return this.deviceCommandModel.findByIdAndDelete(id);
  }

  async findAllDevices(): Promise<ResponseDeviceDto[]> {
    const devices = await this.deviceModel.find().exec();
    const responseDevices = devices.map(device => customPlainToClass(ResponseDeviceDto, device.toObject()));
    return responseDevices.map(device => {
      const instance = this.deviceInstances.get(device._id.toString());
      return {
        ...device,
        deviceStatus: instance ? '1' : '0',
      };
    });
  }

  async findDevices(query: QueryDto): Promise<{ total: number; items: ResponseDeviceDto[] }> {
    const { page = 1, pageSize = 10, search } = query;
    const filter: any = {};
    if (search) {
      filter.$or = [{ deviceName: { $regex: search, $options: 'i' } }];
    }
    const devices = await this.deviceModel
      .find(filter)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
    const total = await this.deviceModel.countDocuments(filter);
    const responseDevices = devices.map(device => customPlainToClass(ResponseDeviceDto, device.toObject()));
    return {
      total,
      items: responseDevices.map(device => {
        const instance = this.deviceInstances.get(device._id.toString());
        return {
          ...device,
          deviceStatus: instance ? '1' : '0',
        };
      }),
    };
  }

  async findDeviceById(id: string): Promise<ResponseDeviceDto> {
    const device = await this.deviceModel.findById(id);
    return customPlainToClass(ResponseDeviceDto, device.toObject());
  }

  async findAllDeviceCommands(deviceId: string): Promise<ResponseDeviceCommandDto[]> {
    const commands = await this.deviceCommandModel.find({ deviceId }).exec();
    return commands.map(command => customPlainToClass(ResponseDeviceCommandDto, command.toObject()));
  }

  async findDeviceCommands(deviceId: string, query: QueryDeviceCommandDto): Promise<{ total: number; items: ResponseDeviceCommandDto[] }> {
    const { page = 1, pageSize = 10, search } = query;

    // 构建查询条件
    const filter: any = { deviceId };

    if (search) {
      filter.$or = [{ commandName: { $regex: search, $options: 'i' } }];
    }

    // 计算总数
    const total = await this.deviceCommandModel.countDocuments(filter);

    // 查询数据
    const commands = await this.deviceCommandModel
      .find(filter)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    // 转换响应格式
    const items = commands.map(command => customPlainToClass(ResponseDeviceCommandDto, command.toObject()));
    return {
      total,
      items,
    };
  }

  async findDeviceCommandById(id: string): Promise<ResponseDeviceCommandDto> {
    const command = await this.deviceCommandModel.findById(id);
    return customPlainToClass(ResponseDeviceCommandDto, command.toObject());
  }

  async createDeviceInstance(deviceId: string) {
    try {
      const device = await this.deviceModel.findById(deviceId);
      if (!device) {
        throw new NotFoundException('设备不存在');
      }

      // 如果已存在实例，先关闭它
      if (this.deviceInstances.has(device.id)) {
        await this.closeDeviceInstance(device.id);
      }

      let instance;
      switch (device.protocol) {
        case 'TCPServer':
          instance = await this.createTCPServer(deviceId, device.devicePort || 502);
          break;
        case 'TCPClient':
          // instance = await this.createTCPClient(createDeviceInstanceDto.ip || '127.0.0.1', createDeviceInstanceDto.port || 502);
          break;
        case 'UDPServer':
          instance = await this.createUDPServer(deviceId, device.devicePort || 502);
          break;
        case 'UDPClient':
          // instance = await this.createUDPClient(createDeviceInstanceDto.ip || '127.0.0.1', createDeviceInstanceDto.port || 502);
          break;
        case 'Modbus':
          // instance = await this.createModbusInstance(device.devicePort.toString(), createDeviceInstanceDto.baudRate || 9600);
          break;
        case 'Telnet':
          // instance = await this.createTelnetClient(createDeviceInstanceDto.ip || '127.0.0.1', createDeviceInstanceDto.port || 23);
          break;
        default:
          throw new BadRequestException('不支持的协议类型');
      }

      this.deviceInstances.set(device.id, instance);
      return { message: '设备服务创建成功', deviceId: device.id };
    } catch (err) {
      this.logger.error(err);
      // 如果错误是 EADDRINUSE，则表示端口已被占用
      if (err.code === 'EADDRINUSE') {
        throw new BadRequestException('设备启动失败，端口已被占用');
      }
      throw new BadRequestException('设备启动失败');
    }
  }

  async stopDeviceInstance(deviceId: string) {
    await this.closeDeviceInstance(deviceId);
    return { message: '设备服务已停止', deviceId };
  }

  private async closeDeviceInstance(deviceId: string) {
    const instance = this.deviceInstances.get(deviceId);
    if (instance) {
      if (instance.close) {
        await instance.close();
      } else if (instance.disconnect) {
        await instance.disconnect();
      }
      this.deviceInstances.delete(deviceId);
      this.logger.log(`设备 [${deviceId}] 已停止`);
    }
  }

  // 设备发送数据
  async deviceSendData(deviceId: string, data: any) {
    const { payload, type } = data;
    // 校验 payload 是否为hex
    if (type === 'HEX' && !/^[0-9a-fA-F]+$/.test(payload)) {
      throw new BadRequestException('HEX格式错误');
    }

    const device = await this.deviceModel.findById(deviceId);
    if (!device) {
      this.logger.error(`TCPServer [${deviceId}] deviceSendData 未找到设备`);
      throw new BadRequestException('设备不存在');
    }

    // 判断设备服务是否已启动
    const instance = this.deviceInstances.get(deviceId);
    if (!instance) {
      this.logger.error(`TCPServer [${deviceId}] deviceSendData 未找到设备服务`);
      throw new BadRequestException('设备未启动');
    }

    // 获取设备连接的 socket，可能存在多个
    const sockets = this.sockets.get(deviceId) || [];
    if (!sockets.length) {
      this.logger.error(`TCPServer [${deviceId}] deviceSendData 未找到 socket`);
      throw new BadRequestException('没有连接的设备');
    }

    // 根据码流类型，将 payload 转换为 Buffer
    // 将字串中的\r\n转换为0d0a
    const sendData = type === 'ASCII' ? Buffer.from(payload.replace(/\\r\\n/g, '\r\n')) : Buffer.from(payload, 'hex');
    // 发送数据
    sockets.forEach(socket => {
      // 根据协议发送数据
      this.sendData(socket, deviceId, sendData, device.protocol);
    });
  }

  private async sendData(socket: any, deviceId: string, data: Buffer, protocol: string) {
    switch (protocol) {
      case 'TCPServer':
        socket.write(data, (err: any) => {
          if (err) {
            this.logger.error(`TCPServer [${deviceId}] 发送数据失败: ${err}`);
          }
          this.logger.debug(`TCPServer [${deviceId}] 发送数据成功: ${data.toString('hex')}`);
          this.wsPush(deviceId, 'send', {
            address: `${socket.remoteAddress.replace('::ffff:', '')}:${socket.remotePort}`,
            stream: `${data.toString('hex')} - ${data.toString()}`,
          });
        });
        break;
      case 'UDPServer':
        socket.server.send(data, 0, data.length, socket.remotePort, socket.remoteAddress, (err: any) => {
          if (err) {
            this.logger.error(`UDPServer [${deviceId}] 发送数据失败: ${err}`);
          }
          this.logger.log(`UDPServer [${deviceId}] 发送数据成功: ${data.toString('hex')}`);
          this.wsPush(deviceId, 'send', {
            address: `${socket.remoteAddress.replace('::ffff:', '')}:${socket.remotePort}`,
            stream: `${data.toString('hex')} - ${data.toString()}`,
          });
        });
        break;
      default:
        this.logger.error(`${protocol} [${deviceId}] 不支持的协议类型`);
        break;
    }
  }

  // 数据处理
  private async dataHandler(_socket: any, deviceId: string, data: Buffer, protocol: string) {
    const deviceCommand = await this.findAllDeviceCommands(deviceId);
    const matchCommand = deviceCommand.find(ele => {
      const { streamType, reqStream } = ele;
      // 按码流类型获取码流
      const payload = streamType === 'ASCII' ? data.toString() : data.toString('hex');
      // 将 reqStream 中的 [标签] 替换为 .+
      const reqStreamStr = reqStream.replace(/\[\$.*?\]/g, '.+').replace(/\[SE:.*?\]/g, '.+');
      // 匹配命令
      const reqStreamReg = new RegExp(`^${reqStreamStr}$`, 'g');
      return reqStreamReg.test(payload);
    });
    if (!matchCommand) return;

    const { commandType, streamType, reqStream, resStream, storeKey, params } = matchCommand;
    const payload = streamType === 'ASCII' ? data.toString() : data.toString('hex');
    this.logger.debug(`${protocol} [${deviceId}] dataHandler 匹配到 ${reqStream} 的指令`);
    let reqStreamModel = reqStream;
    const reqLabels = reqStream.match(/\[\$.*?\]/g);
    // 处理参数，如果参数是 unique 的，则将参数值存储到 storeData 中
    params.forEach(param => {
      if (!reqLabels || !reqLabels.includes(param.paramLabel)) return;

      const { paramKey, paramLabel, paramLength, isUnique } = param;
      // 获取参数在码流模板中的索引
      const idx = reqStreamModel.indexOf(paramLabel);
      if (idx === -1) {
        this.logger.error(`${protocol} [${deviceId}] 未找到 ${paramLabel} 的值`);
        return;
      }
      let length = paramLength;
      const labelLength = paramLabel.match(/\[\$(.*?)\]/)?.[1].split('|')[1];
      // 如果参数为不固定长度，则根据 SE 标签获取长度
      if (labelLength === '?') {
        const seqMatch = reqStreamModel.match(/\[SE:(.*?)\]/);
        if (!seqMatch) {
          this.logger.error(`${protocol} [${deviceId}] 未找到 SE 标签`);
          return;
        }
        const seqIdx = payload.indexOf(seqMatch[1], idx);
        this.logger.debug(`${protocol} [${deviceId}] seqIdx: ${seqIdx}`);
        if (seqIdx === -1) {
          this.logger.error(`${protocol} [${deviceId}] 未在码流中找到分隔符`);
          return;
        }
        length = streamType === 'HEX' ? (seqIdx - idx) / 2 : seqIdx - idx;
        // 将 SE 标签替换为分隔符
        reqStreamModel = reqStreamModel.replace(seqMatch[0], seqMatch[1]);
      } else {
        length = labelLength ? parseInt(labelLength) : length;
      }
      // 根据码流类型，获取参数值长度
      length = streamType === 'ASCII' ? length : length * 2;
      this.logger.debug(`${protocol} [${deviceId}] length: ${length}`);
      // 获取码流中的参数值
      const value = payload.slice(idx, idx + length);
      param.paramValue = value;
      // 将参数值替换到 reqStreamModel 中
      reqStreamModel = reqStreamModel.replace(paramLabel, value);
      this.logger.debug(`paramKey: ${paramKey}, paramLabel: ${paramLabel}, paramLength: ${paramLength}, isUnique: ${isUnique}, value: ${value}`);
    });

    // 获取唯一键
    const uniqueKey =
      params
        .filter(param => param.isUnique)
        .map(param => param.paramValue)
        .join('_') || '_data';

    this.logger.debug(`uniqueKey: ${uniqueKey}`);
    // 如果命令类型是 SET，则将参数值存储到 storeData 中
    switch (commandType) {
      case 'SET':
        const storeData = params.map(param => ({ [param.paramKey]: param.paramValue })).reduce((a, b) => ({ ...a, ...b }), {});
        // 保存前需先判断是否已存在，存在则更新，不存在则创建
        const existingData = this.storeData.get(`${deviceId}-${storeKey}`) || {};
        this.logger.debug(`${protocol} [${deviceId}] existingData: ${storeKey} = ${JSON.stringify(existingData)}`);
        this.storeData.set(`${deviceId}-${storeKey}`, { ...existingData, [uniqueKey]: storeData });
        this.logger.debug(`${protocol} [${deviceId}] 存储数据: ${storeKey} = ${JSON.stringify({ [uniqueKey]: storeData })}`);
        break;
      case 'GET':
        const retrievedStoreData = this.storeData.get(`${deviceId}-${storeKey}`) || {};
        this.logger.debug(`${protocol} [${deviceId}] 获取数据: ${storeKey} = ${JSON.stringify(retrievedStoreData)}`);
        const deviceStatus = (uniqueKey && retrievedStoreData[uniqueKey]) || {};
        this.logger.debug(`${protocol} [${deviceId}] 设备状态: ${JSON.stringify(deviceStatus)}`);
        let resStreamStr = resStream;
        const npLabels = resStream.match(/\[NP.*?\]/g);
        const resLabels = resStream.match(/\[\$.*?\]/g) || [];

        // 处理 NP 标签
        if (npLabels) {
          const npLabel = npLabels[0];
          // 获取 NP 标签的长度(循环次数)
          const npLength = parseInt(npLabel.replace('[NP', '').replace(']', '').replace('|', ''));
          if (!npLength) {
            this.logger.error(`TCPServer [${deviceId}] 未找到 NP 标签的长度`);
            return;
          }
          // 获取 NP 标签在码流模板中的索引
          const npIdx = resStream.indexOf(npLabel);
          // 获取循环的起始位置
          const npStart = npIdx + npLabel.length;

          // 获取码流模板中的前缀
          let npStream = resStream.slice(0, npIdx);
          // 获取循环的索引
          let nextIdx = npStart;
          // 循环次数
          for (let i = 0; i < npLength; i++) {
            resLabels.forEach((label: string, curIdx: number) => {
              // 获取标签在码流模板中的索引
              const idx = resStream.indexOf(label);
              if (idx === -1) return;

              // 获取循环数据的前缀
              const prefix = resStream.slice(nextIdx, idx);
              // 获取参数
              const param = params.find(param => param.paramLabel === label);
              if (!param.paramKey) return;
              // 获取缓存的数据
              const status = retrievedStoreData[i] || retrievedStoreData[i.toString(16).padStart(2, '0')] || {};

              // 将循环数据和参数值拼接
              const val = prefix + (status[param.paramKey] || param.paramValue);

              // 将拼接后的数据添加到 npStream 中
              npStream += val;
              // 如果当前标签不是最后一个标签，则更新 nextIdx
              if (curIdx !== resLabels.length - 1) {
                nextIdx = idx + label.length;
              }
            });
          }
          this.logger.debug(`${protocol} [${deviceId}] npStream: ${npStream}`);
          // 获取最后一个标签
          const lastLabel = resLabels[resLabels.length - 1];

          // 获取最后一个标签在码流模板中的索引
          const npEnd = resStream.indexOf(lastLabel) + lastLabel.length;
          // 获取码流模板中的后缀
          let suffix = '';
          if (lastLabel) {
            suffix = resStream.slice(npEnd);
          }
          // 将拼接后的数据添加到 resStreamStr 中
          resStreamStr = npStream + suffix;
        } else {
          // 处理响应数据, 将 resStream 中的 [变量标签] 替换为 deviceStatus 中的值
          resLabels.forEach(label => {
            const param = params.find(param => param.paramLabel === label);
            if (!param.paramKey) return;
            resStreamStr = resStreamStr.replace(label, deviceStatus[param.paramKey] || param.paramValue);
          });
        }

        this.logger.debug(`${protocol} [${deviceId}] 响应数据: ${resStreamStr}`);
        const sendData = streamType === 'ASCII' ? Buffer.from(resStreamStr.replace(/\\r\\n/g, '\r\n')) : Buffer.from(resStreamStr, 'hex');
        this.sendData(_socket, deviceId, sendData, protocol);
        break;
    }
  }

  private wsPush(deviceId: string, type: string, data: any) {
    switch (type) {
      case 'connect':
        this.wsGateway.sendDeviceConnect(deviceId, data);
        break;
      case 'disconnect':
        this.wsGateway.sendDeviceDisconnect(deviceId, data);
        break;
      case 'send':
        this.wsGateway.sendDeviceSend(deviceId, data);
        break;
      case 'receive':
        this.wsGateway.sendDeviceReceive(deviceId, data);
        break;
    }
  }

  private createTCPServer(deviceId: string, port: number) {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(port, () => {
        this.logger.log(`TCPServer [${deviceId}] 已启动，监听端口：${port}`);
        resolve(server);
      });
      server.on('connection', socket => {
        const clientIP = socket.remoteAddress;
        const clientPort = socket.remotePort;
        const clientLocalPort = socket.localPort; // 客户端的本地端口（发送端口）
        this.logger.log(`客户端连接 TCPServer [${deviceId}]：IP 地址 - ${clientIP}, 端口 - ${clientPort}, 本地端口 - ${clientLocalPort}`);
        this.wsPush(deviceId, 'connect', {
          address: `${clientIP.replace('::ffff:', '')}:${clientPort}`,
        });
        socket.on('data', data => {
          this.logger.log(`TCPServer [${deviceId}] 收到 ${socket.remoteAddress}:${socket.remotePort} 的数据: ${data.toString('hex')}, size: ${data.length}`);
          this.dataHandler(socket, deviceId, data, 'TCPServer');
          this.wsPush(deviceId, 'receive', {
            address: `${socket.remoteAddress.replace('::ffff:', '')}:${socket.remotePort}`,
            stream: `${data.toString('hex')} - ${data.toString()}`,
          });
        });

        socket.on('error', (err: any) => {
          this.logger.error(`TCPServer [${deviceId}] 发生错误: ${err.message}`);
          // 如果错误是 ECONNRESET，则表示连接被重置
          if (err.code === 'ECONNRESET') {
            this.logger.error(`TCPServer [${deviceId}] 连接被重置`);
          }

          // 如果错误是 ECONNREFUSED，则表示连接失败
          if (err.code === 'ECONNREFUSED') {
            this.logger.error(`TCPServer [${deviceId}] 连接失败`);
          }
        });

        socket.on('close', () => {
          this.logger.log(`TCPServer [${deviceId}] 连接关闭`);
          this.wsPush(deviceId, 'disconnect', {
            address: `${socket.remoteAddress.replace('::ffff:', '')}:${socket.remotePort}`,
          });

          // 将 socket 从 sockets 中删除
          const socketMap = this.sockets.get(deviceId) || [];
          const index = socketMap.indexOf(socket);
          if (index !== -1) {
            socketMap.splice(index, 1);
            this.sockets.set(deviceId, socketMap);
          }
        });
      });
      server.on('error', (err: any) => {
        this.logger.error(`TCPServer [${deviceId}] 发生错误: ${err.message}`);
        reject(err);
      });
    });
  }

  // private createTCPClient(host: string, port: number) {
  //   return new Promise((resolve, reject) => {
  //     const client = new net.Socket();
  //     client.connect(port, host, () => {
  //       console.log(`TCP客户端已连接到：${host}:${port}`);
  //       resolve(client);
  //     });
  //     client.on('error', reject);
  //   });
  // }

  private createUDPServer(deviceId: string, port: number) {
    return new Promise((resolve, reject) => {
      const server = dgram.createSocket('udp4');
      server.bind(port);
      server.on('listening', () => {
        this.logger.log(`UDPServer [${deviceId}] 已启动，监听端口：${port}`);
        resolve(server);
      });
      server.on('message', (msg, rinfo) => {
        this.logger.log(`UDPServer [${deviceId}] 收到 ${rinfo.address}:${rinfo.port} 的数据: ${msg.toString('hex')}, size: ${rinfo.size}`);
        const socket = {
          server: server,
          remoteAddress: rinfo.address,
          remotePort: rinfo.port,
        };
        this.dataHandler(socket, deviceId, msg, 'UDPServer');
        this.wsPush(deviceId, 'receive', {
          address: `${rinfo.address}:${rinfo.port}`,
          stream: `${msg.toString('hex')} - ${msg.toString()}`,
        });

        // 将 socket 保存到 sockets 中,socket可能有多个
        const socketMap = this.sockets.get(deviceId) || [];
        const idx = socketMap.findIndex((ele: any) => ele.remoteAddress === socket.remoteAddress && ele.remotePort === socket.remotePort);
        if (idx === -1) {
          socketMap.push(socket);
          this.sockets.set(deviceId, socketMap);
        }
      });
      server.on('error', (err: any) => {
        this.logger.error(`UDPServer [${deviceId}] 发生错误: ${err.message}`);
        reject(err);
      });
    });
  }

  // private createUDPClient(host: string, port: number) {
  //   const client = dgram.createSocket('udp4');
  //   client.connect(port, host);
  //   console.log(`UDP客户端已连接到：${host}:${port}`);
  //   return Promise.resolve(client);
  // }

  // private async createModbusInstance(port: string, baudRate: number) {
  //   const modbusClient = new ModbusRTU();
  //   await modbusClient.connectRTUBuffered(port, { baudRate });
  //   console.log(`Modbus客户端已连接到：${port}`);
  //   return modbusClient;
  // }

  // private createTelnetClient(host: string, port: number) {
  //   return new Promise((resolve, reject) => {
  //     const client = new net.Socket();
  //     client.connect(port, host, () => {
  //       console.log(`Telnet客户端已连接到：${host}:${port}`);
  //       resolve(client);
  //     });
  //     client.on('error', reject);
  //   });
  // }
}
