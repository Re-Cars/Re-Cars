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
              include: {
                dati_generici: true,
                storico_intervento: {
                  orderBy: { data: 'desc' },
                  take: 5,
                },
              },
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
                storico_intervento: {
                  orderBy: { data: 'desc' },
                  take: 5,
                },
              },
            },
          },
        },
      },
      orderBy: { dataprenotazione: 'desc' },
    });
  }

  async statistiche(officinaId: number) {
    const [totale, mese, completate, officina] = await Promise.all([

      this.prisma.prenotazione.count({
        where: { id_officina: officinaId },
      }),

      this.prisma.prenotazione.count({
        where: {
          id_officina: officinaId,
          dataprenotazione: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      this.prisma.prenotazione.count({
        where: { id_officina: officinaId, stato: 'completata' },
      }),

      this.prisma.officina.findUnique({
        where: { id: officinaId },
        select: {
          id: true,
          nome: true,
          ragione_sociale: true,
          partita_iva: true,
          codice_sdi: true,
          email: true,
          telefono: true,
          indirizzo: true,
          sigla_citta: true,
          latitudine: true,
          longitudine: true,
          ponti_disponibili: true,
          orari_apertura: true,
          tipi: true,
          stripe_customer_id: true,
          abbonamento: {
            where: { stato: 'attivo' },
            orderBy: { data_inizio: 'desc' },
            take: 1,
          },
        },
      }),

    ]);

    const tassoCompletamento = totale > 0 ? Math.round((completate / totale) * 100) : 0;

    const mesePrecedente = await this.prisma.prenotazione.count({
      where: {
        id_officina: officinaId,
        dataprenotazione: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    return {
      officina,
      stats: {
        totale,
        mese,
        mesePrecedente,
        completate,
        tassoCompletamento,
      },
    };
  }

  async aggiornaProfilo(officinaId: number, data: any) {
    const campi: any = {};

    if (data.nome !== undefined) campi.nome = data.nome;
    if (data.ragione_sociale !== undefined) campi.ragione_sociale = data.ragione_sociale;
    if (data.partita_iva !== undefined) campi.partita_iva = data.partita_iva;
    if (data.codice_sdi !== undefined) campi.codice_sdi = data.codice_sdi;
    if (data.email !== undefined) campi.email = data.email;
    if (data.telefono !== undefined) campi.telefono = data.telefono;
    if (data.indirizzo !== undefined) campi.indirizzo = data.indirizzo;
    if (data.ponti_disponibili !== undefined) campi.ponti_disponibili = Number(data.ponti_disponibili);
    if (data.tipi !== undefined) campi.tipi = data.tipi;
    if (data.password !== undefined) campi.password = await bcrypt.hash(data.password, 10);

    return this.prisma.officina.update({
      where: { id: officinaId },
      data: campi,
      select: {
        id: true,
        nome: true,
        ragione_sociale: true,
        partita_iva: true,
        codice_sdi: true,
        email: true,
        telefono: true,
        indirizzo: true,
        sigla_citta: true,
        ponti_disponibili: true,
        tipi: true,
      },
    });
  }

  async cambiaAbbonamento(officinaId: number, piano: string) {
    const abbonamentoAttivo = await this.prisma.abbonamento.findFirst({
      where: { id_officina: officinaId, stato: 'attivo' },
    });

    if (abbonamentoAttivo) {
      await this.prisma.abbonamento.update({
        where: { id: abbonamentoAttivo.id },
        data: { stato: 'annullato' },
      });
    }

    return this.prisma.abbonamento.create({
      data: {
        tipo: 'officina',
        piano: piano as any,
        stato: 'attivo',
        data_inizio: new Date(),
        id_officina: officinaId,
      },
    });
  }

  async disdiciAbbonamento(officinaId: number) {
    const abbonamentoAttivo = await this.prisma.abbonamento.findFirst({
      where: { id_officina: officinaId, stato: 'attivo' },
    });

    if (!abbonamentoAttivo) throw new NotFoundException('Nessun abbonamento attivo');

    return this.prisma.abbonamento.update({
      where: { id: abbonamentoAttivo.id },
      data: { stato: 'annullato' },
    });
  }

  async eliminaProfilo(officinaId: number) {
    await this.prisma.abbonamento.deleteMany({
      where: { id_officina: officinaId },
    });

    await this.prisma.prenotazione.deleteMany({
      where: { id_officina: officinaId },
    });

    return this.prisma.officina.delete({
      where: { id: officinaId },
    });
  }

  async agenda(officinaId: number, anno: number, mese: number) {
    const inizio = new Date(anno, mese - 1, 1);
    const fine = new Date(anno, mese, 1);

    return this.prisma.prenotazione.findMany({
      where: {
        id_officina: officinaId,
        dataprenotazione: { gte: inizio, lt: fine },
      },
      include: {
        utente: {
          select: {
            id: true,
            username: true,
            email: true,
            veicolo: {
              select: {
                marca: true,
                modello: true,
                targa: true,
              },
            },
          },
        },
      },
      orderBy: { dataprenotazione: 'asc' },
    });
  }
}