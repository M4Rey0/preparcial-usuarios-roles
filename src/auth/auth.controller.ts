import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@nestjs/authentication';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() datos: RegisterDto) {
    return this.authService.register(datos);
  }
}