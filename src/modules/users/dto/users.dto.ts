import { IsString, IsNotEmpty, Length, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

class User {
  @ApiProperty({ description: '用户名', example: 'test' })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9]*$/, { message: '用户名格式不正确' })
  @Length(2, 50, { message: '用户名长度必须在2-50个字符之间' })
  username: string;

  @ApiProperty({ description: '姓名', example: '张三' })
  @IsString({ message: '姓名必须是字符串' })
  @IsNotEmpty({ message: '姓名不能为空' })
  @Length(2, 50, { message: '姓名长度必须在2-50个字符之间' })
  nickName: string;

  // @ApiProperty({ description: '密码', example: '123456' })
  // @IsString({ message: '密码必须是字符串' })
  // @IsNotEmpty({ message: '密码不能为空' })
  // @Length(6, 20, { message: '密码长度必须在6-20个字符之间' })
  // password: string;

  @ApiProperty({ description: '邮箱', example: 'test@test.com' })
  @IsString({ message: '邮箱必须是字符串' })
  @IsOptional() // 允许为空
  email?: string;

  @ApiProperty({ description: '角色', example: 'admin' })
  @IsString({ message: '角色必须是字符串' })
  @IsNotEmpty({ message: '角色不能为空' })
  @Length(1, 10, { message: '角色长度必须在1-10个字符之间' })
  @Matches(/^(admin|user)$/, { message: '角色必须是admin或user' })
  role: string;

  @ApiProperty({ description: '状态', example: '1' })
  @IsString({ message: '状态必须是字符串' })
  @IsNotEmpty({ message: '状态不能为空' })
  @Length(1, 10, { message: '状态长度必须在1-10个字符之间' })
  @Matches(/^(0|1)$/, { message: '状态必须是0或1' })
  status: string;
}

export class CreateUserDto extends User {}

export class UpdateUserDto extends User {
  @ApiProperty({ description: '用户ID', example: '' })
  @IsString({ message: '用户ID必须是字符串' })
  _id?: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString({ message: '密码必须是字符串' })
  @IsOptional() // 允许为空
  // @IsNotEmpty({ message: '密码不能为空' }) // 创建时不能为空
  // @Length(6, 20, { message: '密码长度必须在6-20个字符之间' })
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,20}$/, { message: '密码必须包含大小写字母、数字和特殊字符' })
  password?: string;
}

export class ResponseUserDto {
  @Expose()
  @Transform(({ obj }) => obj._id)
  _id: string;

  @Expose()
  username: string;

  @Expose()
  nickName: string;

  @Expose()
  email: string;

  @Expose()
  role: string;

  @Expose()
  status: string;
}
