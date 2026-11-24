import { Policy, type PolicyBefore } from '@nestjs/authorization';
import type { User } from './user.entity';

@Policy()
export class UsersPolicy implements PolicyBefore<User> {
  before(user: User | null): boolean | undefined {
    // El admin puede ejecutar todas las acciones de esta policy.
    if (user?.roles?.some((role) => role.role_name === 'admin')) {
      return true;
    }

    // Si no es admin, revisamos la acción específica.
    return undefined;
  }

  create(_user: User | null): boolean {
    return false;
  }

  assignRoles(_user: User | null): boolean {
    // Profesor y estudiante no pueden asignar roles; solo admin pasa por before().
    return false;
  }
}
