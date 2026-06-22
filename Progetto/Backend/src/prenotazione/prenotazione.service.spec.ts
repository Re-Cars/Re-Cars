import { Test, TestingModule } from '@nestjs/testing';
import { PrenotazioneService } from './prenotazione.service';

describe('PrenotazioneService', () => {
  let service: PrenotazioneService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrenotazioneService],
    }).compile();

    service = module.get<PrenotazioneService>(PrenotazioneService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
