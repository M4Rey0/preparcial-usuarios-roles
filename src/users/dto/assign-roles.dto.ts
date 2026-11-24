import { ArrayUnique, IsArray, IsString, Matches } from 'class-validator';

export class AssignRolesDto {
  // Un arreglo vacío permite quitar todos los roles del usuario.
  @IsArray({ message: 'roles inválidos' })
  @ArrayUnique({ message: 'roles inválidos' })
  @IsString({ each: true, message: 'roles inválidos' })
  @Matches(/\S/, { each: true, message: 'roles inválidos' })
  roles!: string[];
}
