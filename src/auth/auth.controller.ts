import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '@nestjs/authentication';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Public() permite entrar sin access token; el DTO sigue validando el body.
  @Public()
  @Post('register')
  register(@Body() datos: RegisterDto) {
    return this.authService.register(datos);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() datos: LoginDto) {
    // El servicio comprueba la contraseña antes de emitir los tokens.
    return this.authService.login(datos);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() datos: RefreshTokenDto) {
    // El refresh token sirve como credencial, aunque el access token haya expirado.
    return this.authService.refresh(datos.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Body() datos: RefreshTokenDto) {
    // 204 significa que la operación terminó sin un cuerpo de respuesta.
    return this.authService.logout(datos.refreshToken);
  }
}
