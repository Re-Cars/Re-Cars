import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateInterventoDto,
  UpdateInterventoDto,
} from './dto/create-intervento.dto';

@Injectable()
export class StoricoService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── GET tutti gli interventi di un veicolo ─────────────────────────────────
  async findByVeicolo(idVeicolo: number, userId?: number, userType?: string) {
    const veicolo = await this.prisma.veicolo.findUnique({
      where: { id: idVeicolo },
    });
    if (!veicolo) {
      throw new NotFoundException(`Veicolo con id ${idVeicolo} non trovato`);
    }
    if (userId && userType !== 'officina' && veicolo.id_utente !== userId) {
      throw new ForbiddenException(
        'Non autorizzato a visualizzare gli interventi di questo veicolo',
      );
    }

    return this.prisma.storico_intervento.findMany({
      where: { id_veicolo: idVeicolo },
      orderBy: { data: 'desc' },
    });
  }

  // ─── POST crea nuovo intervento ──────────────────────────────────────────────
  async create(dto: CreateInterventoDto, userId?: number, userType?: string) {
    const veicolo = await this.prisma.veicolo.findUnique({
      where: { id: dto.id_veicolo },
    });
    if (!veicolo) {
      throw new NotFoundException(
        `Veicolo con id ${dto.id_veicolo} non trovato`,
      );
    }
    if (userId && userType !== 'officina' && veicolo.id_utente !== userId) {
      throw new ForbiddenException(
        'Non autorizzato ad aggiungere interventi a questo veicolo',
      );
    }

    return this.prisma.storico_intervento.create({
      data: {
        id_veicolo: dto.id_veicolo,
        data: new Date(dto.data),
        categoria: dto.categoria,
        nome: dto.nome,
        descrizione: dto.descrizione ?? null,
        mediante: dto.mediante ?? null,
        costo: dto.costo ?? null,
      },
    });
  }

  // ─── PUT aggiorna intervento ─────────────────────────────────────────────────
  async update(
    id: number,
    dto: UpdateInterventoDto,
    userId?: number,
    userType?: string,
  ) {
    const existing = await this.prisma.storico_intervento.findUnique({
      where: { id },
      include: { veicolo: true },
    });
    if (!existing) {
      throw new NotFoundException(`Intervento con id ${id} non trovato`);
    }
    if (
      userId &&
      userType !== 'officina' &&
      existing.veicolo.id_utente !== userId
    ) {
      throw new ForbiddenException(
        'Non autorizzato a modificare questo intervento',
      );
    }

    return this.prisma.storico_intervento.update({
      where: { id },
      data: {
        ...(dto.data && { data: new Date(dto.data) }),
        ...(dto.categoria && { categoria: dto.categoria }),
        ...(dto.nome && { nome: dto.nome }),
        descrizione: dto.descrizione ?? null,
        mediante: dto.mediante ?? null,
        costo: dto.costo ?? null,
      },
    });
  }

  // ─── DELETE elimina intervento ───────────────────────────────────────────────
  async remove(id: number, userId?: number, userType?: string) {
    const existing = await this.prisma.storico_intervento.findUnique({
      where: { id },
      include: { veicolo: true },
    });
    if (!existing) {
      throw new NotFoundException(`Intervento con id ${id} non trovato`);
    }
    if (
      userId &&
      userType !== 'officina' &&
      existing.veicolo.id_utente !== userId
    ) {
      throw new ForbiddenException(
        'Non autorizzato ad eliminare questo intervento',
      );
    }

    await this.prisma.storico_intervento.delete({ where: { id } });
    return { message: 'Intervento eliminato con successo' };
  }
}
