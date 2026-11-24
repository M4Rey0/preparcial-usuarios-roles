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
    // La firma y la expiración se verifican con la configuración de AuthenticationModule.
    super();

    // Registra este proveedor para comprobar los tokens recibidos.
    registry.registerProvider(this);
  }

  async validate({ sub }: JwtClaims) {
    // "sub" contiene el ID del usuario.
    if (!sub) {
      return null;
    }

    // Autenticar: encontrar al usuario activo del token.
    // Autorizar: las policies usarán sus roles para decidir qué rutas puede ejecutar.
    // Se leen los roles actuales de la BD en cada petición: no quedan congelados en el JWT.
    // password permanece oculto porque su columna tiene select: false.
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
