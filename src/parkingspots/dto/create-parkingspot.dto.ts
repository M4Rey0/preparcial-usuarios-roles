import { ArrayUnique, IsArray, IsString, Matches } from 'class-validator';

export class AssignParkingSpotDto {
  @IsString({ message: 'user_id es requerido' })
  @Matches(/\S/, { message: 'user_id es requerido' })
  user_id!: string;

  @IsString({ message: 'spot_id es requerido' })
  @Matches(/\S/, { message: 'spot_id es requerido' })
  spot_id!: string;
}
