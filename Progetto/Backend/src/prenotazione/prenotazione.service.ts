import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { CreatePrenotazioneDto } from './dto/create-prenotazione.dto';

@Injectable()
export class PrenotazioniService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService, // ← mancava
  ) {}

  async crea(utenteId: number, dto: CreatePrenotazioneDto) {

    // 1. Controlla officina
    const officina = await this.prisma.officina.findUnique({
      where: { id: dto.officinaId },
    });
    if (!officina) throw new NotFoundException('Officina non trovata');

    // 2. Controlla utente (serve per prendere l'email) ← mancava
    const utente = await this.prisma.utente.findUnique({
      where: { id: utenteId },
    });
    if (!utente) throw new NotFoundException('Utente non trovato');

    // 3. Costruisci la data
    const soloData = dto.data.includes('T') ? dto.data.split('T')[0] : dto.data;
    const dataCompleta = new Date(`${soloData}T${dto.orario}:00`);
    if (isNaN(dataCompleta.getTime())) {
      throw new BadRequestException(
        `Data o orario non validi. Ricevuti: data='${dto.data}', orario='${dto.orario}'`
      );
    }

    // 4. Salva nel DB
    const descrizione = dto.note
      ? `Servizio: ${dto.servizio} - Note: ${dto.note}`
      : `Servizio: ${dto.servizio}`;

    const prenotazione = await this.prisma.prenotazione.create({
      data: {
        id_officina: dto.officinaId,
        id_utente:   utenteId,
        dataprenotazione: dataCompleta,
        descrizione,
      },
    });

    // 5. Genera il file .ics
    const icsContent = this.generaIcs(officina, dto.servizio, dataCompleta);

    // 6. Invia email ← era nel posto sbagliato, deve essere dopo il salvataggio
    await this.mailerService.sendMail({
      to:      utente.email,
      subject: `Prenotazione confermata — ${officina.nome}`,
      html: `
        <h2>Prenotazione confermata!</h2>
        <p>Ciao <strong>${utente.username}</strong>,</p>
        <p>La tua prenotazione è stata registrata con successo.</p>
        <ul>
          <li><strong>Officina:</strong> ${officina.nome}</li>
          <li><strong>Indirizzo:</strong> ${officina.indirizzo}</li>
          <li><strong>Servizio:</strong> ${dto.servizio}</li>
          <li><strong>Data:</strong> ${soloData}</li>
          <li><strong>Orario:</strong> ${dto.orario}</li>
          ${dto.note ? `<li><strong>Note:</strong> ${dto.note}</li>` : ''}
        </ul>
        <p>Trovi in allegato il file da importare su Google Calendar.</p>
      `,
      attachments: [{
        filename:    'appuntamento.ics',
        content:     icsContent,
        contentType: 'text/calendar',
      }],
    });

    return prenotazione;
  }

  // 7. Genera il contenuto del file .ics
  private generaIcs(officina: any, servizio: string, data: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    const formato = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const fine = new Date(data.getTime() + 60 * 60 * 1000); // +1 ora

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RECARS//IT',
      'BEGIN:VEVENT',
      `SUMMARY:${servizio} — ${officina.nome}`,
      `DTSTART:${formato(data)}`,
      `DTEND:${formato(fine)}`,
      `LOCATION:${officina.indirizzo}`,
      `DESCRIPTION:Servizio: ${servizio}`,
      `UID:recars-${Date.now()}@recars.it`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
}