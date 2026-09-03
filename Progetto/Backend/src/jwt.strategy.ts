import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

interface RequestWithCookies extends Request {
  cookies: Record<string, string>;
}

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
        (request: RequestWithCookies) => {
          let data: string | null = null;
          if (request && request.cookies) {
            const cookies = request.cookies as Record<
              string,
              string | undefined
            >;
            data = cookies['access_token'] ?? null;
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

  validate(payload: JwtPayload): JwtPayload {
    return { sub: payload.sub, email: payload.email, tipo: payload.tipo };
  }
}
