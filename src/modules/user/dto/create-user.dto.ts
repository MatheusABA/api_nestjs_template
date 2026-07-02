import { IsEmail, IsString } from "class-validator";

export class CreateUserDto {

  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString({
    message: 'Password must be a string',
  })
  password!: string;
}