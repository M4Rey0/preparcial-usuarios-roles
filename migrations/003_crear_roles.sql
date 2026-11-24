-- Supervisor = P
-- Conductor = E

BEGIN;

INSERT INTO roles (role_name, description)
VALUES
  ('supervisror', 'Solo puede sus reservas'),
  ('conductor', 'Solo puede ver sus reservas')
ON CONFLICT (role_name) DO NOTHING;

COMMIT;
