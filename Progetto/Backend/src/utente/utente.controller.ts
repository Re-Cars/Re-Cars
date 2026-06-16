import { Controller, Post, Body, Get, Patch, Param, UseGuards, Req, Res } from '@nestjs/common';
import { UtenteService } from './utente.service';
import { CreateUtenteDto } from './dto/create-utente.dto';
import { LoginUtenteDto } from './dto/login-utente.dto';
import { UpdateUtenteDto } from './dto/update-utente.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { Request, Response } from 'express';
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
                secure: true,
                sameSite: 'none',
            });
            return { message: 'Logout effettuato con successo' };
        }

   @UseGuards(JwtAuthGuard)
        @Get('utente/:id')
            async getUtentebyID(@Param('id') id: string) {
                return this.utenteService.getUtentebyID(+id);
            }

    @UseGuards(JwtAuthGuard)
        @Patch('utente/:id')
            async aggiornaUtente(
            @Param('id') id: string,
            @Body() datiRicevuti: UpdateUtenteDto,
            @Req() req: Request
            ) {
            return this.utenteService.aggiornaUtente(+id, datiRicevuti);
            }
}