import { Test, TestingModule } from '@nestjs/testing';
import { OfficinaService } from './officina.service';

describe('OfficinaService', () => {
  let service: OfficinaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OfficinaService],
    }).compile();

    service = module.get<OfficinaService>(OfficinaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
