import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
// Usiamo 'import type' per evitare l'errore con isolatedModules ed emitDecoratorMetadata
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        `Errore Critico: La variabile d'ambiente JWT_SECRET non è definita!`,
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let data = null;
          if (request && request.cookies) {
            data = request.cookies['access_token'];
          }
          return data;
        },
        // fallback per l'app mobile, che manda il token come Bearer header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return { sub: payload.sub, email: payload.email, tipo: payload.tipo };
  }
}
