import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuthenticationModule,
  type Duration,
} from '@nestjs/authentication';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { User } from './users/user.entity';
import { Role } from './roles/role.entity';

import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthProvider } from './auth/jwt-auth.provider';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

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
        allowInMemoryStorage: true,
      }),
    }),
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService, JwtAuthProvider],
})
export class AppModule {}