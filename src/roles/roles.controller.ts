import { Body, Controller, Get, Post } from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { CreateRoleDto } from './dto/create-role.dto';
import { RolesPolicy } from './roles.policy';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Can(RolesPolicy, 'create')
  create(@Body() datos: CreateRoleDto) {
    return this.rolesService.create(datos);
  }

  @Get()
  @Can(RolesPolicy, 'list')
  list() {
    return this.rolesService.list();
  }
}
