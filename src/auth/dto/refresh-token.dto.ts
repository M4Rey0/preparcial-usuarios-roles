import { IsString, Matches } from 'class-validator';

// Se comparte entre refresh y logout: ambos reciben el token en el body.
export class RefreshTokenDto {
  @IsString()
  @Matches(/\S/, {
    message: 'refreshToken es requerido',
  })
  refreshToken!: string;
}
