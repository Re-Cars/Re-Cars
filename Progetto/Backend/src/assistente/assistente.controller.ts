import {
  Body,
  Controller,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { CurrentUser } from '../current-user.decorator';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { JwtPayload } from '../jwt-payload.interface';
import { AssistenteService } from './assistente.service';
import { ChatDto } from './dto/chat.dto';
import { LimiteSuperato } from './limite-richieste';

@Controller('assistente')
export class AssistenteController {
  constructor(private readonly assistente: AssistenteService) {}

  /**
   * Risposta dell'assistente in streaming (Server-Sent Events): un evento
   * `delta` per ogni pezzo di testo e un `done` finale con risposta e azioni
   * proposte. La chiave Gemini resta qui nel backend (GEMINI_API_KEY).
   */
  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async chat(
    @Body() dto: ChatDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    if (user.tipo === 'officina') {
      throw new ForbiddenException(
        "L'assistente è disponibile solo per gli utenti",
      );
    }
    try {
      this.assistente.limite.consuma(String(user.sub));
    } catch (err) {
      if (err instanceof LimiteSuperato) {
        res.setHeader('Retry-After', String(err.riprovaTraSecondi));
        throw new HttpException(err.message, HttpStatus.TOO_MANY_REQUESTS);
      }
      throw err;
    }

    // interrompe la chiamata a Gemini se l'utente chiude il pannello
    const annulla = new AbortController();
    res.on('close', () => annulla.abort());

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    // senza no-transform alcuni proxy comprimono e accumulano la risposta,
    // consegnandola tutta insieme alla fine
    res.setHeader('Cache-Control', 'no-store, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    for await (const evento of this.assistente.rispondi(
      Number(user.sub),
      dto,
      annulla.signal,
    )) {
      if (annulla.signal.aborted) break;
      res.write(`data: ${JSON.stringify(evento)}\n\n`);
    }
    res.end();
  }
}
