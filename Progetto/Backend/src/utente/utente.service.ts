import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt'; 
import { CreateUtenteDto } from '../utente/dto/create-utente.dto';
import { LoginUtenteDto } from './dto/login-utente.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtenteService {
  constructor(private prisma: PrismaService, private jwtService: JwtService,) {}

  async registra(data: CreateUtenteDto) {

    const hashedPassword = await bcrypt.hash(data.password, 10);


    return this.prisma.utente.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        cellulare: data.cellulare || null,
      },
    });
  }

   async login(data: LoginUtenteDto) {
    const utente = await this.prisma.utente.findUnique({
      where: { email: data.email },
    });

    if (!utente) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    const passwordValida = await bcrypt.compare(data.password, utente.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenziali non valide');
    }

    const { password, ...risultato } = utente;

    //  genera e restituisce il token insieme ai dati utente
    const payload = { sub: utente.id, email: utente.email };
    const token = this.jwtService.sign(payload);
    return {
      token, // Lo passeremo al controller che lo imposterà nel cookie
      utente: risultato,
    };
  }
    async getUtentebyID(id : number)  {
        return this.prisma.utente.findUnique({
            where: { id },
            select: {
            id: true,
            username: true,
            email: true,
            cellulare: true,
            }
            }
        )};
    }
