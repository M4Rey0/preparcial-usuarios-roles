import {
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { Public } from '@nestjs/authentication';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() datos: RegisterDto) {
    return this.authService.register(datos);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() datos: LoginDto) {
    return this.authService.login(datos);
  }
}