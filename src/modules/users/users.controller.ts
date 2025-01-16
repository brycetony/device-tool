import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, ResponseUserDto, UpdateUserDto } from './dto/users.dto';
import { QueryDto } from '../../common/dto/common.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('用户管理')
@Controller('users')
@Roles('superadmin', 'admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('add')
  @ApiOperation({ summary: '创建用户' })
  @Roles('superadmin')
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return {
      message: '用户创建成功',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    };
  }

  @Get('list')
  @ApiOperation({ summary: '获取用户列表' })
  async findAll(@Query() query: QueryDto): Promise<{ total: number; items: ResponseUserDto[] }> {
    return this.usersService.findUsers(query);
  }

  @Put('edit')
  @ApiOperation({ summary: '更新用户' })
  @Roles('superadmin')
  async update(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(updateUserDto);
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: '删除用户' })
  @Roles('superadmin')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
