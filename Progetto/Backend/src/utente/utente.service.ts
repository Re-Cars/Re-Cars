import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUtenteDto } from './dto/create-utente.dto';
import { LoginUtenteDto } from './dto/login-utente.dto';
import { UpdateUtenteDto } from './dto/update-utente.dto';
import { LoginAziendaDto } from './dto/login-azienda.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtenteService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registra(data: CreateUtenteDto) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const utente = await this.prisma.utente.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        cellulare: data.cellulare || null,
        tipo: data.tipo || 'privato',
        ragione_sociale: data.ragione_sociale || null,
        partita_iva: data.partita_iva || null,
        codice_sdi: data.codice_sdi || null,
      },
    });

    const { password, ...risultato } = utente;

    const payload = { sub: utente.id, email: utente.email, tipo: utente.tipo };
    return {
      access_token: this.jwtService.sign(payload),
      utente: risultato,
    };
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
    const payload = { sub: utente.id, email: utente.email, tipo: utente.tipo };
    return {
      access_token: this.jwtService.sign(payload), // Lo passeremo al controller che lo imposterà nel cookie
      utente: risultato,
    };
  }

  async loginAzienda(data: LoginAziendaDto) {
    const utente = await this.prisma.utente.findUnique({
      where: { partita_iva: data.partita_iva },
    });

    if (!utente || utente.tipo !== 'azienda') {
      throw new UnauthorizedException('Credenziali non valide');
    }

    const passwordValida = await bcrypt.compare(data.password, utente.password);
    if (!passwordValida)
      throw new UnauthorizedException('Credenziali non valide');

    const { password, ...risultato } = utente;

    const payload = {
      sub: utente.id,
      partita_iva: utente.partita_iva,
      tipo: utente.tipo,
    };
    return {
      access_token: this.jwtService.sign(payload),
      utente: risultato,
    };
  }

  async getUtentebyID(id: number) {
    return this.prisma.utente.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        cellulare: true,
        avatar: true,
        abbonamento: {
          where: { stato: 'attivo' },
          orderBy: { data_inizio: 'desc' },
          take: 1,
        },
      },
    });
  }

  async aggiornaUtente(id: number, data: UpdateUtenteDto) {
    const campiDaAggiornare: any = {};

    if (data.username) campiDaAggiornare.username = data.username;
    if (data.email) campiDaAggiornare.email = data.email;
    if (data.cellulare) campiDaAggiornare.cellulare = data.cellulare;
    if (data.avatar) campiDaAggiornare.avatar = data.avatar;
    if (data.password) {
      campiDaAggiornare.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.utente.update({
      where: { id },
      data: campiDaAggiornare,
      select: {
        id: true,
        username: true,
        email: true,
        cellulare: true,
        avatar: true,
      },
    });
  }
}
