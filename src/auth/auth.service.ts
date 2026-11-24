import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordHasher, TokenService } from '@nestjs/authentication';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  // Autenticar comprueba quién es el usuario. Las policies deciden qué puede hacer.
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async register(datos: RegisterDto) {
    // PasswordHasher usa scrypt: guardamos el hash, nunca la contraseña original.
    const passwordHash = await this.passwordHasher.hash(datos.password);

    const usuario = this.usersRepository.create({
      email: datos.email.trim().toLowerCase(),
      password: passwordHash,
      name: datos.name.trim(),
      phone: datos.phone,
      is_active: true,
      // El registro público no concede roles; esa tarea corresponde a un admin.
      roles: [],
    });

    try {
      const usuarioGuardado = await this.usersRepository.save(usuario);

      // No devolvemos la entidad guardada porque todavía contiene el hash.
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

        // La restricción de PostgreSQL evita duplicados incluso con registros simultáneos.
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
    // select: false oculta password en consultas normales; aquí lo necesitamos.
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

    // También se verifica cuando no hay usuario: el paquete usa un hash de prueba.
    // Así no rechazamos un email inexistente antes de hacer el trabajo del hash.
    const passwordCorrecta = await this.passwordHasher.verify(
      datos.password,
      usuario?.password,
    );

    if (!usuario || !passwordCorrecta) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!usuario.is_active) {
      throw new HttpException('Usuario desactivado', HttpStatus.LOCKED);
    }

    // El paquete escribe el ID en sub y usa las duraciones configuradas en .env.
    // Los roles se consultan en la BD al usar el token, para mantenerlos actualizados.
    return this.tokenService.issue(usuario.id, {
      method: 'password',
    });
  }

  // Entrega nuevos tokens y consume el refresh token anterior.
  // Si se reutiliza uno ya consumido, el paquete revoca toda su familia.
  refresh(refreshToken: string) {
    return this.tokenService.refresh(refreshToken);
  }

  // Revoca la familia de refresh tokens de esta sesión.
  // El access token ya emitido sigue vigente hasta que expire.
  async logout(refreshToken: string): Promise<void> {
    // Ignoramos el booleano: logout devuelve 204 aunque el token ya no exista.
    await this.tokenService.revoke(refreshToken);
  }
}
