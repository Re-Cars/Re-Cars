import { Controller, Post, Body, Get, Param, UseGuards, Res } from '@nestjs/common';
import { UtenteService } from './utente.service';
import { CreateUtenteDto } from './dto/create-utente.dto';
import { LoginUtenteDto } from './dto/login-utente.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { Response } from 'express';
@Controller('auth')
export class UtenteController {
  

    constructor(private readonly utenteService: UtenteService) {}

    @Post('register')
      async register(@Body() datiRicevuti: CreateUtenteDto) {
          return this.utenteService.registra(datiRicevuti);
      }
      
@Post('login')
    async login(
        @Body() datiRicevuti: LoginUtenteDto,
        @Res({ passthrough: true }) response: Response 
    ) {
        const { access_token, utente } = await this.utenteService.login(datiRicevuti);
        
        // Impostiamo il cookie HttpOnly nel browser
        response.cookie('access_token',access_token , {
            httpOnly: true,
            secure: true, // true solo in HTTPS (produzione)
            sameSite: 'none',
            maxAge: 3600000, 
        });

        
        return { utente };
    }
@Post('logout')
async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
    return { message: 'Logout effettuato con successo' };
}
   @UseGuards(JwtAuthGuard)
    @Get('utente/:id')
        async getUtentebyID(@Param('id') id: string) {
            return this.utenteService.getUtentebyID(+id);
        }
}