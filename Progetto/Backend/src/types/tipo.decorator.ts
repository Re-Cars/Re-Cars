
import { SetMetadata } from '@nestjs/common';
export const Tipo = (tipo: 'utente' | 'officina') => SetMetadata('tipo', tipo);