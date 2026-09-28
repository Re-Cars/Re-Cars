import { Test, TestingModule } from '@nestjs/testing';
import { OfficinaController } from './officina.controller';
import { OfficinaService } from './officina.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificheService } from '../notifiche/notifiche.service';

describe('OfficinaController', () => {
  let controller: OfficinaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfficinaController],
      providers: [
        OfficinaService,
        PrismaService,
        JwtService,
        {
          provide: NotificheService,
          useValue: { avvisaCambioStato: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<OfficinaController>(OfficinaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
