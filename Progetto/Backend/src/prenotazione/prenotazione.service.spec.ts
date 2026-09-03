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
