import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@nestjs/authorization';
import { AuthenticationModule, type Duration } from '@nestjs/authentication';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { User } from './users/user.entity';
import { Role } from './roles/role.entity';

import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthProvider } from './auth/jwt-auth.provider';
import { RolesController } from './roles/roles.controller';
import { RolesService } from './roles/roles.service';
import { RolesPolicy } from './roles/roles.policy';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { UsersPolicy } from './users/users.policy';

@Module({
  imports: [
    // Lee .env y permite consultar sus valores desde otros archivos.
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Conecta Nest con PostgreSQL. Las tablas las crean los archivos SQL.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<string>('DB_PORT')),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASS'),
        database: config.getOrThrow<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    // Hace disponibles los repositorios para consultar y guardar usuarios y roles.
    TypeOrmModule.forFeature([User, Role]),

    // Configuración de autenticación y duración de los tokens.
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        accessToken: {
          key: config.getOrThrow<string>('JWT_SECRET'),
          ttl: config.getOrThrow<Duration>('JWT_EXPIRES_IN'),
        },
        refreshToken: {
          ttl: config.getOrThrow<Duration>('JWT_REFRESH_EXPIRES_IN'),
        },
        // Los refresh tokens se pierden al reiniciar la API; los usuarios no.
        allowInMemoryStorage: true,
      }),
    }),

    // Primero se identifica al usuario; después se revisan sus permisos.
    AuthorizationModule.forRoot(),
  ],
  controllers: [
    AppController,
    AuthController,
    RolesController,
    UsersController,
  ],
  providers: [
    AppService,
    AuthService,
    JwtAuthProvider,
    RolesService,
    UsersService,
    RolesPolicy,
    UsersPolicy,
  ],
})
export class AppModule {}
