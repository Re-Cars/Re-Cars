import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { VeicoloService } from './veicolo.service';
import { CreateVeicoloDto } from './dto/create-veicolo.dto';

@Controller('veicolo')
    export class VeicoloController {
        constructor(private readonly veicoloService: VeicoloService) {}

    @Post()
        async cerca(@Body() dto: CreateVeicoloDto) {
            return this.veicoloService.cercaESalva(dto);
        }

    @Get('utente/:id')
        async getVeicoliUtente(@Param('id') id: string) {
            return this.veicoloService.getVeicoliByUtente(+id);
        }
}