import { IsString, Matches } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @Matches(/\S/, {
    message: 'refreshToken es requerido',
  })
  refreshToken!: string;
}