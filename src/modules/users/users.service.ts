import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { ResponseUserDto } from './dto/users.dto';
import { QueryDto } from '../../common/dto/common.dto';
import { customPlainToClass } from '../../common/utils/transformer';
import { createHash } from 'crypto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // 检查并创建超级管理员
  async ensureSuperAdmin() {
    try {
      const superAdmin = await this.findOne('superadmin');
      if (!superAdmin) {
        // 如果不存在超级管理员，则创建
        const password = createHash('md5').update('superadmin123').digest('hex');
        await this.create({
          username: 'superadmin',
          password,
          email: 'superadmin@example.com',
          role: 'superadmin',
          status: 1,
          nickName: '超级管理员',
        });
        console.log('超级管理员账户已创建');
      } else {
        console.log('超级管理员账户已存在');
      }
    } catch (error) {
      console.error('创建超级管理员失败:', error);
    }
  }

  async findOneByUserId(userId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: userId }).exec();
  }

  async findOne(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async create(userData: any): Promise<UserDocument> {
    const existingUser = await this.findOne(userData.username);
    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }
    // 使用md5加密密码
    const md5 = createHash('md5');
    const hashedPassword = md5.update('123456').digest('hex');
    const createdUser = new this.userModel({
      ...userData,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  // 查询用户列表
  async findAll(): Promise<ResponseUserDto[]> {
    const users = await this.userModel.find().exec(); // 返回所有用户
    return users.map(user => customPlainToClass(ResponseUserDto, user.toObject()));
  }

  // 更新用户
  async update(updateUser: any): Promise<UserDocument> {
    const { _id, username, email, role, status, nickName, password } = updateUser;
    console.log(updateUser);
    let data: any = { username, email, role, status, nickName };
    if (password) {
      data = { password };
    }
    console.log('data: ', data);
    return this.userModel.findByIdAndUpdate(_id, data, { new: true }).exec(); // 根据 ID 更新用户
  }

  // 删除用户
  async remove(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec(); // 根据 ID 删除用户
  }

  async findUsers(query: QueryDto): Promise<{ total: number; items: ResponseUserDto[] }> {
    const { page = 1, pageSize = 10, search } = query;
    const filter: any = {};
    if (search) {
      filter.$or = [{ username: { $regex: search, $options: 'i' } }];
    }
    const users = await this.userModel
      .find(filter)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();
    const total = await this.userModel.countDocuments(filter);
    return { total, items: users.map(user => customPlainToClass(ResponseUserDto, user.toObject())) };
  }
}
