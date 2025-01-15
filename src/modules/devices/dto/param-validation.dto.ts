import { IsMongoId } from 'class-validator';

export class MongoIdParam {
  @IsMongoId({ message: 'ID格式不正确，必须是有效的MongoDB ID' })
  id: string;
}
