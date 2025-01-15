import { plainToClass } from 'class-transformer';

export function customPlainToClass<T>(cls: new (...args: any[]) => T, plain: any): T {
  return plainToClass(cls, plain, { excludeExtraneousValues: true });
}
