import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { Role } from './role.entity';

// Crea roles y consulta el catálogo guardado en PostgreSQL.
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async create(datos: CreateRoleDto) {
    const rol = this.rolesRepository.create({
      role_name: datos.role_name.trim(),
      description: datos.description ?? null,
    });

    try {
      const rolGuardado = await this.rolesRepository.save(rol);
      return { message: 'Rol creado con éxito', roleId: rolGuardado.id };
    } catch (error: unknown) {
      // UNIQUE evita duplicados, incluso ante solicitudes simultáneas.
      if (error instanceof QueryFailedError) {
        const errorBD = error.driverError as {
          code?: string;
          constraint?: string;
        };
        if (
          errorBD.code === '23505' &&
          errorBD.constraint === 'roles_role_name_key'
        ) {
          throw new ConflictException('role_name ya existe');
        }
      }
      throw error;
    }
  }

  async list() {
    try {
      const roles = await this.rolesRepository.find({
        order: { role_name: 'ASC' },
      });
      return roles.map((rol) => ({
        id: rol.id,
        role_name: rol.role_name,
        description: rol.description,
      }));
    } catch {
      throw new InternalServerErrorException('Error al obtener roles');
    }
  }
}
