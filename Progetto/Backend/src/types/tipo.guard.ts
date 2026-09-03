import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class TipoGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const tipoRichiesto = this.reflector.get<string>(
      'tipo',
      context.getHandler(),
    );
    if (!tipoRichiesto) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || user.tipo !== tipoRichiesto) {
      throw new ForbiddenException(
        'Non autorizzato per questo tipo di account',
      );
    }
    return true;
  }
}
