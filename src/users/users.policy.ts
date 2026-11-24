import { Policy, type PolicyBefore } from '@nestjs/authorization';
import type { User } from './user.entity';

@Policy()
export class UsersPolicy implements PolicyBefore<User> {
  before(user: User | null): boolean | undefined {
    // El administrador pasa la comprobación sin ejecutar el método de permiso.
    if (user?.roles?.some((role) => role.role_name === 'admin')) {
      return true;
    }

    // Los demás usuarios continúan al método solicitado: list() o assignRoles().
    return undefined;
  }

  list(_user: User | null): boolean {
    // Solo el administrador puede listar usuarios.
    return false;
  }

  assignRoles(_user: User | null): boolean {
    return false;
  }
}
