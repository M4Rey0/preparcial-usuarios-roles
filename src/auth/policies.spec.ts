import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
  AuthorizationModule,
  AuthorizationService,
} from '@nestjs/authorization';
import { Test, type TestingModule } from '@nestjs/testing';
import { RolesPolicy } from '../roles/roles.policy';
import type { User } from '../users/user.entity';
import { UsersPolicy } from '../users/users.policy';

function userWithRoles(roleNames: string[]): User {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'prueba@example.com',
    password: '',
    name: 'Usuario de prueba',
    phone: null,
    is_active: true,
    created_at: new Date('2026-11-24T00:00:00Z'),
    roles: roleNames.map((role_name) => ({
      id: '00000000-0000-4000-8000-000000000002',
      role_name,
      description: null,
    })),
  };
}

describe('Permisos de usuarios y roles', () => {
  let moduleRef: TestingModule;
  let authorization: AuthorizationService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AuthorizationModule.forRoot({ globalGuard: false })],
      providers: [RolesPolicy, UsersPolicy],
    }).compile();

    await moduleRef.init();
    authorization = moduleRef.get(AuthorizationService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  // Se usa el servicio real para ejecutar before() y después la regla aplicable.
  function permissions(user: User | null): Promise<boolean[]> {
    return Promise.all([
      authorization.can(RolesPolicy, 'create', user),
      authorization.can(RolesPolicy, 'list', user),
      authorization.can(UsersPolicy, 'list', user),
      authorization.can(UsersPolicy, 'assignRoles', user),
    ]);
  }

  it('permite al administrador crear, consultar y asignar roles', async () => {
    await expect(permissions(userWithRoles(['admin']))).resolves.toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it.each([
    ['un usuario sin roles', userWithRoles([])],
    ['un supervisor', userWithRoles(['supervisor'])],
    ['un visitante', null],
  ] as const)(
    'deniega los permisos administrativos a %s',
    async (_name, user) => {
      await expect(permissions(user)).resolves.toEqual([
        false,
        false,
        false,
        false,
      ]);
    },
  );
});
