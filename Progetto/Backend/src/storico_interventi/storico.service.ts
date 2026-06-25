import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service'; // aggiusta il path se diverso
import { CreateInterventoDto, UpdateInterventoDto } from './dto/create-intervento.dto';

@Injectable()
export class StoricoService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── GET tutti gli interventi di un veicolo ─────────────────────────────────
  async findByVeicolo(idVeicolo: number) {
    return this.prisma.storico_intervento.findMany({
      where: { id_veicolo: idVeicolo },
      orderBy: { data: 'desc' },
    });
  }

  // ─── POST crea nuovo intervento ──────────────────────────────────────────────
  async create(dto: CreateInterventoDto) {
    return this.prisma.storico_intervento.create({
      data: {
        id_veicolo:  dto.id_veicolo,
        data:        new Date(dto.data),
        categoria:   dto.categoria,
        nome:        dto.nome,
        descrizione: dto.descrizione ?? null,
        mediante:    dto.mediante    ?? null,
        costo:       dto.costo       ?? null,
      },
    });
  }

  // ─── PUT aggiorna intervento ─────────────────────────────────────────────────
  async update(id: number, dto: UpdateInterventoDto) {
    const existing = await this.prisma.storico_intervento.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Intervento con id ${id} non trovato`);
    }

    return this.prisma.storico_intervento.update({
      where: { id },
      data: {
        ...(dto.data      && { data:      new Date(dto.data) }),
        ...(dto.categoria && { categoria: dto.categoria }),
        ...(dto.nome      && { nome:      dto.nome }),
        descrizione: dto.descrizione ?? null,
        mediante:    dto.mediante    ?? null,
        costo:       dto.costo       ?? null,
      },
    });
  }

  // ─── DELETE elimina intervento ───────────────────────────────────────────────
  async remove(id: number) {
    const existing = await this.prisma.storico_intervento.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Intervento con id ${id} non trovato`);
    }

    await this.prisma.storico_intervento.delete({ where: { id } });
    return { message: 'Intervento eliminato con successo' };
  }
}