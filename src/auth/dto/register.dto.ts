import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Define los datos permitidos al registrarse. Los roles se asignan por otra ruta.
export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(128, {
    message: 'La contraseña debe tener máximo 128 caracteres',
  })
  password!: string;

  @IsString()
  @Matches(/\S/, {
    message: 'El nombre es requerido',
  })
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
