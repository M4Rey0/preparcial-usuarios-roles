import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateReservationDto {
  @IsString({ message: 'vehicule_plate es requerido' })
  @Matches(/\S/, { message: 'vehicule_plate es requerido' })
  vehicule_plate!: string;

  @IsString({ message: 'date es requerido' })
  date!: string;

}
