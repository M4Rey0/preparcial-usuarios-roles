import { ConflictException, Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly passwordHasher = new PasswordHasher();

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async register(datos: RegisterDto) {
    // Convertimos la contraseña en un hash antes de guardarla.
    const passwordHash = await this.passwordHasher.hash(datos.password);

    // Preparamos el usuario. El registro comienza sin roles.
    const usuario = this.usersRepository.create({
      email: datos.email.trim().toLowerCase(),
      password: passwordHash,
      name: datos.name.trim(),
      phone: datos.phone,
      is_active: true,
      roles: [],
    });

    try {
      // Aquí se guarda realmente en PostgreSQL.
      const usuarioGuardado = await this.usersRepository.save(usuario);

      // Elegimos expresamente qué información devolver.
      return {
        message: 'Usuario registrado con éxito',
        userId: usuarioGuardado.id,
      };
    } catch (error: unknown) {
      if (error instanceof QueryFailedError) {
        const errorBD = error.driverError as {
          code?: string;
          constraint?: string;
        };

        // La base de datos impide registrar dos veces el mismo correo.
        if (
          errorBD.code === '23505' &&
          errorBD.constraint === 'users_email_key'
        ) {
          throw new ConflictException('Email ya registrado');
        }
      }

      throw error;
    }
  }
}