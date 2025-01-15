import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CustomLoggerService } from '../logger/logger.service';

@WebSocketGateway({
  cors: true,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('WebsocketGateway');
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket 服务器初始化开始...');
    if (!server) {
      this.logger.error('WebSocket 服务器实例为空！');
      return;
    }

    try {
      // 添加服务器事件监听
      server.on('connection_error', err => {
        this.logger.error(`连接错误: ${err.message}`, err.stack);
      });

      server.on('connect', socket => {
        this.logger.log(`新的连接: ${socket.id}`);
      });

      this.logger.log('WebSocket 服务器初始化完成');
      // this.logger.debug(`当前服务器配置: ${JSON.stringify(server.opts)}`);
    } catch (error) {
      this.logger.error('WebSocket 服务器初始化失败', error.stack);
    }
  }

  handleConnection(client: Socket) {
    try {
      const clientId = client.id;
      const transport = client.conn.transport.name;
      const query = client.handshake.query;
      this.logger.log(`客户端连接成功 - ID: ${clientId}, Transport: ${transport}`);
      this.logger.debug(`连接参数: ${JSON.stringify(query)}`);

      // 处理客户端订阅设备消息
      client.on('subscribeDevice', (deviceId: string) => {
        try {
          client.join(`device_${deviceId}`);
          this.logger.debug(`客户端 ${clientId} 订阅了设备 ${deviceId} 的消息`);
          client.emit('subscribed', { deviceId, status: 'success' });
        } catch (error) {
          this.logger.error(`订阅设备失败: ${error.message}`, error.stack);
          client.emit('error', { message: '订阅设备失败', error: error.message });
        }
      });

      // 处理客户端取消订阅设备消息
      client.on('unsubscribeDevice', (deviceId: string) => {
        try {
          client.leave(`device_${deviceId}`);
          this.logger.debug(`客户端 ${clientId} 取消订阅了设备 ${deviceId} 的消息`);
          client.emit('unsubscribed', { deviceId, status: 'success' });
        } catch (error) {
          this.logger.error(`取消订阅设备失败: ${error.message}`, error.stack);
          client.emit('error', { message: '取消订阅设备失败', error: error.message });
        }
      });

      // 监听错误事件
      client.on('error', error => {
        this.logger.error(`客户端 ${clientId} 发生错误: ${error}`);
      });

      // 发送连接成功消息给客户端
      client.emit('connect', {
        id: clientId,
        status: 'success',
        transport: transport,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('处理连接时发生错误:', error.stack);
    }
  }

  handleDisconnect(client: Socket) {
    try {
      const clientId = client.id;
      this.logger.debug(`客户端断开连接: ${clientId}`);
      client.emit('disconnect', {
        id: clientId,
        status: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('处理断开连接时发生错误:', error.stack);
    }
  }

  // 推送设备连接的消息
  sendDeviceConnect(deviceId: string, data: any) {
    this.server.to(`device_${deviceId}`).emit('device:connect', {
      ...data,
      deviceId,
      timestamp: new Date().toISOString(),
    });
  }

  // 推送设备断开连接的消息
  sendDeviceDisconnect(deviceId: string, data: any) {
    this.server.to(`device_${deviceId}`).emit('device:disconnect', {
      ...data,
      deviceId,
      timestamp: new Date().toISOString(),
    });
  }

  // 推送设备接收数据的消息
  sendDeviceReceive(deviceId: string, data: any) {
    this.server.to(`device_${deviceId}`).emit('device:receive', {
      ...data,
      deviceId,
      timestamp: new Date().toISOString(),
    });
  }

  // 推送设备发送数据的消息
  sendDeviceSend(deviceId: string, data: any) {
    this.server.to(`device_${deviceId}`).emit('device:send', {
      ...data,
      deviceId,
      timestamp: new Date().toISOString(),
    });
  }

  // 推送设备状态更新消息
  sendDeviceStatusUpdate(deviceId: string, status: any) {
    this.server.to(`device_${deviceId}`).emit('device:status', {
      deviceId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // 推送设备告警消息
  sendDeviceAlert(deviceId: string, alert: any) {
    this.server.to(`device_${deviceId}`).emit('deviceAlert', {
      deviceId,
      alert,
      timestamp: new Date().toISOString(),
    });
  }

  // 推送设备命令响应消息
  sendDeviceCommandResponse(deviceId: string, commandResponse: any) {
    this.server.to(`device_${deviceId}`).emit('deviceCommandResponse', {
      deviceId,
      commandResponse,
      timestamp: new Date().toISOString(),
    });
  }
}
