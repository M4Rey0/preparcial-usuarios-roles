import { Policy, type PolicyBefore } from '@nestjs/authorization';
import type { User } from '../users/user.entity';  

@Policy()
export class ReservationPolicy implements PolicyBefore<User> {
  before(user: User | null): boolean | undefined {
    if (user?.roles?.some((role) => role.role_name === 'admin')) {
      return true;
    }
    return undefined;
  }

  create(_user: User | null): boolean {
    return false;
  }
}