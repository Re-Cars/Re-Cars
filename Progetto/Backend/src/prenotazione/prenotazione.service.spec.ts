import { Test, TestingModule } from '@nestjs/testing';
import { PrenotazioniService } from './prenotazione.service';
import { PrismaService } from '../prisma.service';
import { MailerService } from '@nestjs-modules/mailer';

describe('PrenotazioneService', () => {
  let service: PrenotazioniService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrenotazioniService,
        PrismaService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<PrenotazioniService>(PrenotazioniService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

describe('PrenotazioniService.crea', () => {
  const prenotazioneSalvata = {
    id: 42,
    id_officina: 1,
    id_utente: 7,
    dataprenotazione: new Date('2026-10-02T09:30:00'),
    descrizione: 'Servizio: Tagliando',
  };
  const prisma = {
    officina: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        nome: 'Officina',
        indirizzo: 'Via Roma 1',
      }),
    },
    utente: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 7, username: 'mario', email: 'm@x.it' }),
    },
    prenotazione: { create: jest.fn().mockResolvedValue(prenotazioneSalvata) },
  };
  const dto = {
    officinaId: 1,
    servizio: 'Tagliando',
    data: '2026-10-02T09:30:00',
    orario: '09:30',
  };

  it("restituisce la prenotazione anche se l'email di conferma fallisce", async () => {
    const mailer = {
      sendMail: jest
        .fn()
        .mockRejectedValue(new Error('SMTP non raggiungibile')),
    };
    const service = new PrenotazioniService(
      prisma as unknown as PrismaService,
      mailer as unknown as MailerService,
    );

    await expect(service.crea(7, dto)).resolves.toBe(prenotazioneSalvata);
    expect(prisma.prenotazione.create).toHaveBeenCalled();
    expect(mailer.sendMail).toHaveBeenCalled();
  });
});

describe('PrenotazioniService.annullaDaUtente', () => {
  const prisma = {
    prenotazione: { findUnique: jest.fn(), update: jest.fn() },
  };
  const service = new PrenotazioniService(
    prisma as unknown as PrismaService,
    {} as MailerService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('annulla una propria prenotazione in attesa', async () => {
    prisma.prenotazione.findUnique.mockResolvedValue({
      id: 5,
      id_utente: 7,
      stato: 'in_attesa',
    });
    await service.annullaDaUtente(5, 7, 'annullata');
    expect(prisma.prenotazione.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { stato: 'annullata' },
    });
  });

  it("non permette all'utente di confermare", async () => {
    await expect(service.annullaDaUtente(5, 7, 'confermata')).rejects.toThrow(
      /solo annullare/,
    );
  });

  it('non tocca le prenotazioni di altri utenti', async () => {
    prisma.prenotazione.findUnique.mockResolvedValue({
      id: 5,
      id_utente: 8,
      stato: 'in_attesa',
    });
    await expect(service.annullaDaUtente(5, 7, 'annullata')).rejects.toThrow(
      /non trovata/,
    );
    expect(prisma.prenotazione.update).not.toHaveBeenCalled();
  });

  it('non annulla una prenotazione già completata', async () => {
    prisma.prenotazione.findUnique.mockResolvedValue({
      id: 5,
      id_utente: 7,
      stato: 'completata',
    });
    await expect(service.annullaDaUtente(5, 7, 'annullata')).rejects.toThrow(
      /non si può annullare/,
    );
  });
});
