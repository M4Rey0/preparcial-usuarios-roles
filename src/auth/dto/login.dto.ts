import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MaxLength(128)
  password!: string;
}