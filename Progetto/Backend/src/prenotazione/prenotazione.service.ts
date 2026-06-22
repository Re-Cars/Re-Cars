import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePrenotazioneDto } from './dto/create-prenotazione.dto';

@Injectable()
export class PrenotazioniService {
  constructor(private readonly prisma: PrismaService) {}

  async crea(utenteId: number, dto: CreatePrenotazioneDto) {
    const officina = await this.prisma.officina.findUnique({
      where: { id: dto.officinaId },
    });
    if (!officina) {
      throw new NotFoundException('Officina non trovata');
    }

    // 2. Gestione robusta di data e orario per il TIMESTAMP di PostgreSQL
    let dataCompleta: Date; // Definisce il tipo come istanza di Date

    if (dto.data.includes('T')) {
      const soloData = dto.data.split('T')[0];
      dataCompleta = new Date(`${soloData}T${dto.orario}:00`); // <-- Controlla che ci sia 'new'
    } else {
      dataCompleta = new Date(`${dto.data}T${dto.orario}:00`); // <-- Controlla che ci sia 'new'
    }

    // Controllo di sicurezza sulla validità della data
    if (isNaN(dataCompleta.getTime())) {
      throw new BadRequestException(
        `Formato data o orario non valido. Ricevuti: data='${dto.data}', orario='${dto.orario}'`,
      );
    }

    const descrizioneCompleta = dto.note 
      ? `Servizio: ${dto.servizio} - Note: ${dto.note}`
      : `Servizio: ${dto.servizio}`;

    return this.prisma.prenotazione.create({
      data: {
        id_officina: dto.officinaId,
        id_utente: utenteId,
        dataprenotazione: dataCompleta, // Ora riceve un'istanza valida di Date
        descrizione: descrizioneCompleta,
      },
    });
  }
}