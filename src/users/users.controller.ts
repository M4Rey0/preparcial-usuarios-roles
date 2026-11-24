import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { AssignRolesDto } from './dto/assign-roles.dto';
import type { User } from './user.entity';
import { UsersPolicy } from './users.policy';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  // La autenticación global sigue exigiendo un token válido.
  @Can.Anyone()
  me(@CurrentUser() usuario: User) {
    return this.usersService.me(usuario.id);
  }

  @Get()
  @Can(UsersPolicy, 'list')
  list() {
    return this.usersService.list();
  }

  @Patch(':id/roles')
  @Can(UsersPolicy, 'assignRoles')
  assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: AssignRolesDto,
  ) {
    return this.usersService.assignRoles(id, datos);
  }
}
