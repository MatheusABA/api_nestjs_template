import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  displayName!: string;

  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString({
    message: 'Password must be a string',
  })
  @MinLength(6, {
    message: 'Password must be have at least 6 characters',
  })
  password!: string;
}
