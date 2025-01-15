import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/users.dto';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Public()
@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { username: string; password: string }) {
    const user = await this.authService.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new HttpException('用户名或密码错误', HttpStatus.UNAUTHORIZED);
    } else if (user.status === '0') {
      throw new HttpException('用户已被禁用', HttpStatus.FORBIDDEN);
    }
    return this.authService.login(user);
  }

  @Post('register')
  @Roles('superadmin')
  async register(@Body() registerDto: CreateUserDto) {
    const user = await this.authService.register(registerDto);

    return {
      message: '用户注册成功',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    };
  }
  // 修改密码
  @Post('change-password')
  async changePassword(@Body() changePasswordDto: { userId: string; oldPassword: string; newPassword: string }): Promise<any> {
    return this.authService.changePassword(changePasswordDto);
  }
}
