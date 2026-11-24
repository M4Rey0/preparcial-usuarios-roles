import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// El DTO comprueba el formato; AuthService verifica las credenciales.
export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MaxLength(128)
  password!: string;
}
