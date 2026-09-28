import { Test, TestingModule } from '@nestjs/testing';
import { OfficinaService } from './officina.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificheService } from '../notifiche/notifiche.service';

describe('OfficinaService', () => {
  let service: OfficinaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<OfficinaService>(OfficinaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
