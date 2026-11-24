import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Role } from '../roles/role.entity';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService: asignación de roles', () => {
  const rol = Object.assign(new Role(), {
    id: 'eb1ba0cb-9c82-4d1c-9d84-9b85870aef05',
    role_name: 'admin',
    description: null,
  });

  const crearPrueba = () => {
    const usuario = Object.assign(new User(), {
      id: '0942f9bb-5482-4f83-b5d0-e9aee5768258',
      roles: [rol],
    });
    const usuarios = {
      findOne: jest.fn<() => Promise<User | null>>().mockResolvedValue(usuario),
      save: jest
        .fn<(entity: User) => Promise<User>>()
        .mockResolvedValue(usuario),
    };
    const roles = {
      findBy: jest.fn<() => Promise<Role[]>>().mockResolvedValue([rol]),
    };
    const servicio = new UsersService(
      usuarios as unknown as Repository<User>,
      roles as unknown as Repository<Role>,
    );
    return { usuario, usuarios, roles, servicio };
  };

  it('rechaza toda la asignación si algún rol no existe', async () => {
    const { usuario, usuarios, servicio } = crearPrueba();

    await expect(
      servicio.assignRoles(usuario.id, { roles: ['admin', 'inexistente'] }),
    ).rejects.toThrow(new BadRequestException('roles inválidos'));

    expect(usuario.roles).toEqual([rol]);
    expect(usuarios.save).not.toHaveBeenCalled();
  });

  it('permite quitar todos los roles mediante un arreglo vacío', async () => {
    const { usuario, usuarios, roles, servicio } = crearPrueba();

    await expect(
      servicio.assignRoles(usuario.id, { roles: [] }),
    ).resolves.toEqual({ message: 'Roles asignados' });

    expect(usuario.roles).toEqual([]);
    expect(roles.findBy).not.toHaveBeenCalled();
    expect(usuarios.save).toHaveBeenCalledWith(usuario);
  });
});
