import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 3 })
  vehicule_plate!: string;

  @Column({ type: 'date' })
  date!: string;
}