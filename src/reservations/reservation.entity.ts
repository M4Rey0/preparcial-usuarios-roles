import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Parkingspot } from '../parkingspot/parkingspot.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  vehicule_plate!: string;

  @Column()
  date!: string;
}
