import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CreateOfficinaDto } from './dto/create-officina.dto';
import { LoginOfficinaDto } from './dto/login-officina.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OfficinaService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registra(data: CreateOfficinaDto) {
    const esistente = await this.prisma.officina.findUnique({
      where: { partita_iva: data.partita_iva },
    });
    if (esistente) throw new ConflictException('Partita IVA già registrata');

    const esistenteEmail = await this.prisma.officina.findUnique({
      where: { email: data.email },
    });
    if (esistenteEmail) throw new ConflictException('Email già registrata');

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const officina = await this.prisma.officina.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nome: data.nome,
        ragione_sociale: data.ragione_sociale,
        partita_iva: data.partita_iva,
        codice_sdi: data.codice_sdi || null,
        telefono: data.telefono,
        indirizzo: data.indirizzo,
        sigla_citta: data.sigla_citta,
        tipi: data.tipi || [],
      },
    });

    const { password, ...risultato } = officina;

    const payload = { sub: officina.id, partita_iva: officina.partita_iva, tipo: 'officina' };
    return {
      access_token: this.jwtService.sign(payload),
      officina: risultato,
    };
  }

  async login(data: LoginOfficinaDto) {
    const officina = await this.prisma.officina.findUnique({
      where: { partita_iva: data.partita_iva },
    });

    if (!officina) throw new UnauthorizedException('Credenziali non valide');

    const passwordValida = await bcrypt.compare(data.password, officina.password);
    if (!passwordValida) throw new UnauthorizedException('Credenziali non valide');

    const { password, ...risultato } = officina;

    const payload = { sub: officina.id, partita_iva: officina.partita_iva, tipo: 'officina' };
    return {
      access_token: this.jwtService.sign(payload),
      officina: risultato,
    };
  }

  async getOfficinaById(id: number) {
    return this.prisma.officina.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nome: true,
        ragione_sociale: true,
        partita_iva: true,
        codice_sdi: true,
        telefono: true,
        indirizzo: true,
        sigla_citta: true,
        tipi: true,
        latitudine: true,
        longitudine: true,
        ponti_disponibili: true,
        orari_apertura: true,
      },
    });
  }

  async dashboard(officinaId: number) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const domani = new Date(oggi);
  domani.setDate(domani.getDate() + 1);

  const inizioSettimana = new Date(oggi);
  inizioSettimana.setDate(oggi.getDate() - oggi.getDay() + 1);

  const [prenotazioniOggi, settimanaStats, abbonamento, officina] = await Promise.all([

    this.prisma.prenotazione.findMany({
      where: {
        id_officina: officinaId,
        dataprenotazione: { gte: oggi, lt: domani },
      },
      include: {
        utente: {
          select: {
            id: true,
            username: true,
            email: true,
            veicolo: {
              include: { dati_generici: true },
            },
          },
        },
      },
      orderBy: { dataprenotazione: 'asc' },
    }),

    this.prisma.prenotazione.findMany({
      where: {
        id_officina: officinaId,
        dataprenotazione: { gte: inizioSettimana },
      },
      select: { stato: true },
    }),

    this.prisma.abbonamento.findFirst({
      where: { id_officina: officinaId, stato: 'attivo' },
      orderBy: { data_inizio: 'desc' },
    }),

    this.prisma.officina.findUnique({
      where: { id: officinaId },
      select: { ponti_disponibili: true },
    }),

  ]);

  const oggiConfermate = prenotazioniOggi.filter(p => p.stato === 'confermata').length;
  const pontiOccupati = prenotazioniOggi.filter(p => p.stato === 'confermata').length;
  const settimanaAttesa = settimanaStats.filter(p => p.stato === 'in_attesa').length;

  return {
    prenotazioniOggi,
    oggiTotale: prenotazioniOggi.length,
    oggiConfermate,
    settimanaT: settimanaStats.length,
    settimanaAttesa,
    pontiOccupati,
    pontiDisponibili: officina?.ponti_disponibili ?? null,
    abbonamento,
  };
}

  async aggiornaStatoPrenotazione(prenotazioneId: number, stato: string, officinaId: number) {
    const prenotazione = await this.prisma.prenotazione.findUnique({
      where: { id: prenotazioneId },
    });

    if (!prenotazione) throw new NotFoundException('Prenotazione non trovata');
    if (prenotazione.id_officina !== officinaId) throw new ForbiddenException('Non autorizzato');

    return this.prisma.prenotazione.update({
      where: { id: prenotazioneId },
      data: { stato: stato as any },
    });
  }

  async tutteLePrenotazioni(officinaId: number, stato?: string) {
    return this.prisma.prenotazione.findMany({
      where: {
        id_officina: officinaId,
        ...(stato ? { stato: stato as any } : {}),
      },
      include: {
        utente: {
          select: {
            id: true,
            username: true,
            email: true,
            cellulare: true,
            veicolo: {
              include: {
                dati_generici: true,
                dati_specifici: true,
              },
            },
          },
        },
      },
      orderBy: { dataprenotazione: 'desc' },
    });
  }
}