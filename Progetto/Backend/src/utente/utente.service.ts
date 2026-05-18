import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUtenteDto } from '../utente/dto/create-utente.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtenteService {
  constructor(private prisma: PrismaService) {}

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
}