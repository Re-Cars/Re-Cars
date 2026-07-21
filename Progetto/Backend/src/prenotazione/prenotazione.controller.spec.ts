import { Test, TestingModule } from '@nestjs/testing';
import { PrenotazioniController } from './prenotazione.controller';
import { PrenotazioniService } from './prenotazione.service';
import { PrismaService } from '../prisma.service';
import { MailerService } from '@nestjs-modules/mailer';

describe('PrenotazioneController', () => {
  let controller: PrenotazioniController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrenotazioniController],
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

    controller = module.get<PrenotazioniController>(PrenotazioniController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
