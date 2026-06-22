import { Test, TestingModule } from '@nestjs/testing';
import { PrenotazioneController } from './prenotazione.controller';
import { PrenotazioneService } from './prenotazione.service';

describe('PrenotazioneController', () => {
  let controller: PrenotazioneController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrenotazioneController],
      providers: [PrenotazioneService],
    }).compile();

    controller = module.get<PrenotazioneController>(PrenotazioneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
