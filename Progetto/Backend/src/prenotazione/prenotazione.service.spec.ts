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
