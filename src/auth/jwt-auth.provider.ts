import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

@Injectable()
export class JwtAuthProvider extends JwtBearerProvider<User> {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    registry: AuthenticationRegistry,
  ) {
    super();

    // Registra este proveedor para comprobar los tokens recibidos.
    registry.registerProvider(this);
  }

  async validate({ sub }: JwtClaims) {
    // "sub" contiene el ID del usuario.
    if (!sub) {
      return null;
    }

    // Consulta al usuario activo y sus roles actuales.
    return this.usersRepository.findOne({
      where: {
        id: sub,
        is_active: true,
      },
      relations: {
        roles: true,
      },
    });
  }
}