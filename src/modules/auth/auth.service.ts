import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateUserDto } from '../users/dto/users.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = (await this.usersService.findOne(username)).toJSON();
    console.log('user:', user);
    if (user && password === user.password) {
      // 使用不同的变量名来避免命名冲突
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        nickname: user.nickName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.usersService.findOne(createUserDto.username);
    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }
    // 使用md5加密密码
    const md5 = crypto.createHash('md5');
    const hashedPassword = md5.update('123456').digest('hex');
    return this.usersService.create({ ...createUserDto, password: hashedPassword });
  }

  async changePassword(changePasswordDto: { userId: string; oldPassword: string; newPassword: string }): Promise<any> {
    const { userId, oldPassword, newPassword } = changePasswordDto;
    const user = await this.usersService.findOneByUserId(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    } else if (user.password !== oldPassword) {
      throw new BadRequestException('旧密码错误');
    }
    this.usersService.update({ _id: userId, password: newPassword });
    return {
      message: '密码修改成功',
    };
  }
}
