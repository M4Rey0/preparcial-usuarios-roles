import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Esta clase representa la tabla roles.
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  role_name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;
}