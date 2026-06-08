import { Injectable } from '@nestjs/common';
import { CreateOfficinaDto } from './dto/create-officina.dto';
import { UpdateOfficinaDto } from './dto/update-officina.dto';

@Injectable()
export class OfficinaService {
  
  findAll() {
    return `This action returns all officina`;
  }

  findOne(id: number) {
    return `This action returns a #${id} officina`;
  }
 
}
