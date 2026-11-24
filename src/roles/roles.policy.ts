import { Policy, type PolicyBefore } from '@nestjs/authorization';
import type { User } from '../users/user.entity';

@Policy()
export class RolesPolicy implements PolicyBefore<User> {
  before(user: User | null): boolean | undefined {
    // El administrador pasa la comprobación sin ejecutar el método de permiso.
    if (user?.roles?.some((role) => role.role_name === 'admin')) {
      return true;
    }

    // Los demás usuarios continúan al método solicitado: create() o list().
    return undefined;
  }

  create(_user: User | null): boolean {
    return false;
  }

  list(_user: User | null): boolean {
    // Solo el administrador puede listar roles.
    return false;
  }
}
