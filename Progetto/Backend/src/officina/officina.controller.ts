import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OfficinaService } from './officina.service';
import { CreateOfficinaDto } from './dto/create-officina.dto';
import { UpdateOfficinaDto } from './dto/update-officina.dto';

@Controller('officina')
export class OfficinaController {
  constructor(private readonly officinaService: OfficinaService) {}

  @Post()
  create(@Body() createOfficinaDto: CreateOfficinaDto) {
    return this.officinaService.create(createOfficinaDto);
  }

  @Get()
  findAll() {
    return this.officinaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.officinaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOfficinaDto: UpdateOfficinaDto) {
    return this.officinaService.update(+id, updateOfficinaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.officinaService.remove(+id);
  }
}
