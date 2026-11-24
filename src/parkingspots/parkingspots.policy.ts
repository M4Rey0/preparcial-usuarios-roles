import { Policy, type PolicyBefore } from '@nestjs/authorization';
import type { User } from './user.entity';

@Policy()
export class UsersPolicy implements PolicyBefore<User> {
  before(user: User | null): boolean | undefined {
    // El admin puede ejecutar todas las acciones de esta policy.
    if (user?.roles?.some((role) => role.role_name === 'admin')) {
      return true;
    }

    return undefined;
  }
 
  create(_user: User | null): boolean {
      return false;
    }
}