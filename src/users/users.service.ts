import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../roles/role.entity';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async assignRoles(id: string, datos: AssignRolesDto) {
    const usuario = await this.usersRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const roles = datos.roles.length
      ? await this.rolesRepository.findBy({ role_name: In(datos.roles) })
      : [];

    // Todos los nombres deben existir antes de modificar las asociaciones.
    if (roles.length !== datos.roles.length) {
      throw new BadRequestException('roles inválidos');
    }

    // Sustituye la lista completa; [] quita las filas de users_roles.
    usuario.roles = roles;
    await this.usersRepository.save(usuario);
    return { message: 'Roles asignados' };
  }

  async me(id: string) {
    const usuario = await this.usersRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Se enumeran los campos públicos para no devolver nunca password.
    return {
      id: usuario.id,
      email: usuario.email,
      name: usuario.name,
      phone: usuario.phone,
      roles: usuario.roles.map((rol) => rol.role_name),
    };
  }

  async list() {
    try {
      const usuarios = await this.usersRepository.find({
        order: { created_at: 'DESC' },
      });
      return usuarios.map((usuario) => ({
        id: usuario.id,
        email: usuario.email,
        name: usuario.name,
        roles: usuario.roles.map((rol) => rol.role_name),
      }));
    } catch {
      throw new InternalServerErrorException('Error al listar usuarios');
    }
  }
}
