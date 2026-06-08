import { Injectable } from '@nestjs/common';
import { CreateOfficinaDto } from './dto/create-officina.dto';
import { UpdateOfficinaDto } from './dto/update-officina.dto';

@Injectable()
export class OfficinaService {
  
  create(createOfficinaDto: CreateOfficinaDto) {
    return 'This action adds a new officina';
  }

  findAll() {
    return `This action returns all officina`;
  }

  findOne(id: number) {
    return `This action returns a #${id} officina`;
  }

  update(id: number, updateOfficinaDto: UpdateOfficinaDto) {
    return `This action updates a #${id} officina`;
  }

  remove(id: number) {
    return `This action removes a #${id} officina`;
  }
  
}