import { Controller, Post, Body, Get, Param , UseGuards } from '@nestjs/common';
import { UtenteService } from './utente.service';
import { CreateUtenteDto } from './dto/create-utente.dto';
import { LoginUtenteDto } from './dto/login-utente.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';

@Controller('auth')
export class UtenteController {
  

    constructor(private readonly utenteService: UtenteService) {}

    @Post('register')
      async register(@Body() datiRicevuti: CreateUtenteDto) {
          return this.utenteService.registra(datiRicevuti);
      }
      
    @Post('login')
        async login(@Body() datiRicevuti: LoginUtenteDto) {
        return this.utenteService.login(datiRicevuti);
  }
   @UseGuards(JwtAuthGuard)
    @Get('utente/:id')
        async getUtentebyID(@Param('id') id: string) {
            return this.utenteService.getUtentebyID(+id);
        }
}