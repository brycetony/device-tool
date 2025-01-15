import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 设置全局前缀为 /api
  app.setGlobalPrefix('api');

  const logger = new Logger('Request');
  app.use((req, _res, next) => {
    logger.log(`收到请求: ${req.method} ${req.url}`);
    next();
  });

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 去除未定义的属性
      transform: true, // 自动转换类型
      forbidNonWhitelisted: true, // 禁止未定义的属性
      errorHttpStatusCode: 422, // 验证错误状态码
    })
  );

  // 配置 Swagger
  const config = new DocumentBuilder().setTitle('设备管理 API').setDescription('设备管理系统的 API 文档').setVersion('1.0').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 检查并创建超级管理员账户
  const usersService = app.get(UsersService);
  await usersService.ensureSuperAdmin();

  await app.listen(process.env.PORT ?? 3000);

  process.on('uncaughtException', err => {
    logger.error('未处理的异常:', err);
  });

  logger.log(`应用已启动，运行端口: ${process.env.PORT ?? 3000}`);
}
bootstrap();
