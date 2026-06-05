import { Test, TestingModule } from '@nestjs/testing';
import { OfficinaController } from './officina.controller';
import { OfficinaService } from './officina.service';

describe('OfficinaController', () => {
  let controller: OfficinaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfficinaController],
      providers: [OfficinaService],
    }).compile();

    controller = module.get<OfficinaController>(OfficinaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
