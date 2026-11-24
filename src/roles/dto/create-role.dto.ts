import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateRoleDto {
  @IsString({ message: 'role_name es requerido' })
  @Matches(/\S/, { message: 'role_name es requerido' })
  role_name!: string;

  @IsOptional()
  @IsString({ message: 'description debe ser un texto' })
  description?: string | null;
}
