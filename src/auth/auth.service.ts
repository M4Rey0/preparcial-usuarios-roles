import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PasswordHasher,
  TokenService,
} from '@nestjs/authentication';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async register(datos: RegisterDto) {
    const passwordHash = await this.passwordHasher.hash(datos.password);

    const usuario = this.usersRepository.create({
      email: datos.email.trim().toLowerCase(),
      password: passwordHash,
      name: datos.name.trim(),
      phone: datos.phone,
      is_active: true,
      roles: [],
    });

    try {
      const usuarioGuardado = await this.usersRepository.save(usuario);

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

  async login(datos: LoginDto) {
    // Para iniciar sesión necesitamos consultar también el hash.
    const usuario = await this.usersRepository.findOne({
      where: {
        email: datos.email.trim().toLowerCase(),
      },
      select: {
        id: true,
        password: true,
        is_active: true,
      },
    });

    // Compara la contraseña recibida con el hash guardado.
    const passwordCorrecta = await this.passwordHasher.verify(
      datos.password,
      usuario?.password,
    );

    if (!usuario || !passwordCorrecta) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!usuario.is_active) {
      throw new HttpException(
        'Usuario desactivado',
        HttpStatus.LOCKED,
      );
    }

    // Genera el access token y el refresh token.
        return this.tokenService.issue(usuario.id, {
      method: 'password',
    });
  }

  // Entrega nuevos tokens e invalida el refresh token utilizado.
  refresh(refreshToken: string) {
    return this.tokenService.refresh(refreshToken);
  }

  // Invalida los refresh tokens de esa sesión.
  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revoke(refreshToken);
  }
}