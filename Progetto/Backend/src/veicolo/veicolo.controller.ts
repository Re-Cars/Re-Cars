import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { VeicoloService } from './veicolo.service';
import { CreateVeicoloDto } from './dto/create-veicolo.dto';

@Controller('veicolo')
export class VeicoloController {
    constructor(private readonly veicoloService: VeicoloService) {}

    @Post()
    async salva(@Body() dto: CreateVeicoloDto) {
        return this.veicoloService.cercaESalva(dto);
    }

    @Get('cerca/:targa')
    async cerca(@Param('targa') targa: string) {
        return this.veicoloService.cercaSoloDati(targa);
    }

    @Get('utente/:id')
    async getVeicoliUtente(@Param('id') id: string) {
        return this.veicoloService.getVeicoliByUtente(+id);
    }

    @Get(':id')
    async getVeicolo(@Param('id') id: string) {
        return this.veicoloService.getVeicoloById(+id);
    }
}