import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { CreatePrenotazioneDto } from './dto/create-prenotazione.dto';

interface OfficinaPerIcs {
  nome: string;
  indirizzo: string;
}

/** Sanitizza una stringa per evitare XSS nell'HTML delle email */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
        `Data o orario non validi. Ricevuti: data='${dto.data}', orario='${dto.orario}'`,
      );
    }

    // 4. Salva nel DB
    const descrizione = dto.note
      ? `Servizio: ${dto.servizio} - Note: ${dto.note}`
      : `Servizio: ${dto.servizio}`;

    const prenotazione = await this.prisma.prenotazione.create({
      data: {
        id_officina: dto.officinaId,
        id_utente: utenteId,
        dataprenotazione: dataCompleta,
        descrizione,
      },
    });

    const icsContent = this.generaIcs(officina, dto.servizio, dataCompleta);

    const safeUsername = escapeHtml(utente.username);
    const safeOfficinaNome = escapeHtml(officina.nome);
    const safeOfficinaIndirizzo = escapeHtml(officina.indirizzo);
    const safeServizio = escapeHtml(dto.servizio);
    const safeData = escapeHtml(soloData);
    const safeOrario = escapeHtml(dto.orario);
    const safeNote = dto.note ? escapeHtml(dto.note) : undefined;

    await this.mailerService.sendMail({
      to: utente.email,
      subject: `Prenotazione confermata — ${safeOfficinaNome}`,
      html: `
        <h2>Prenotazione confermata!</h2>
        <p>Ciao <strong>${safeUsername}</strong>,</p>
        <p>La tua prenotazione è stata registrata con successo.</p>
        <ul>
          <li><strong>Officina:</strong> ${safeOfficinaNome}</li>
          <li><strong>Indirizzo:</strong> ${safeOfficinaIndirizzo}</li>
          <li><strong>Servizio:</strong> ${safeServizio}</li>
          <li><strong>Data:</strong> ${safeData}</li>
          <li><strong>Orario:</strong> ${safeOrario}</li>
          ${safeNote ? `<li><strong>Note:</strong> ${safeNote}</li>` : ''}
        </ul>
        <p>Trovi in allegato il file da importare su Google Calendar.</p>
      `,
      attachments: [
        {
          filename: 'appuntamento.ics',
          content: icsContent,
          contentType: 'text/calendar',
        },
      ],
    });

    return prenotazione;
  }

  async trovaPerUtente(utenteId: number) {
    // 1. Controlla se l'utente esiste (opzionale, ma garantisce consistenza nei log)
    const utenteEsiste = await this.prisma.utente.findUnique({
      where: { id: utenteId },
    });
    if (!utenteEsiste) throw new NotFoundException('Utente non trovato');

    // 2. Recupera le prenotazioni ordinate dalla più recente
    return await this.prisma.prenotazione.findMany({
      where: {
        id_utente: utenteId,
      },
      include: {
        // Include i dettagli dell'officina relazionata (es. nome, indirizzo)
        officina: true,
      },
      orderBy: {
        dataprenotazione: 'desc',
      },
    });
  }

  // 7. Genera il contenuto del file .ics
  private generaIcs(
    officina: OfficinaPerIcs,
    servizio: string,
    data: Date,
  ): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    const formato = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

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
