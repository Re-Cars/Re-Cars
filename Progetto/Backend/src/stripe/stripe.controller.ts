import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { NotificheService } from '../notifiche/notifiche.service';
import { avvisoAbbonamento } from '../notifiche/promemoria';
import { PortaleDto, RinnovoDto } from './dto/rinnovo.dto';
import {
  StripeService,
  statoRinnovo,
  type AbbonamentoStripe,
} from './stripe.service';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { Request, Response } from 'express';
import { CurrentUser } from '../current-user.decorator';
import type { JwtPayload } from '../jwt-payload.interface';
import { piano_abbonamento } from '@prisma/client';

interface StripeCheckoutSessionMetadata {
  piano: string;
  tipo: 'utente' | 'officina';
  id: string;
}

interface StripeCheckoutSession {
  metadata: StripeCheckoutSessionMetadata | null;
  subscription: string | null;
}

interface StripeInvoice {
  parent?: {
    subscription_details?: { subscription?: string | { id: string } } | null;
  } | null;
  period_end?: number;
}

interface StripeWebhookEvent {
  type: string;
  data: {
    object: StripeCheckoutSession | AbbonamentoStripe | StripeInvoice;
  };
}

/** Origine del frontend accettata per i redirect (localhost o FRONTEND_BASE_URL). */
function baseUrlSicuro(richiesto?: string): string {
  let baseUrl =
    process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:5500/Frontend';
  if (richiesto) {
    try {
      const parsed = new URL(richiesto);
      const configuredUrl = process.env.FRONTEND_BASE_URL
        ? new URL(process.env.FRONTEND_BASE_URL)
        : null;
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        (configuredUrl && parsed.hostname === configuredUrl.hostname)
      ) {
        baseUrl = richiesto.replace(/\/+$/, '');
      }
    } catch {
      // Fallback su baseUrl predefinito se formato URL non valido
    }
  }
  return baseUrl;
}

const aGiorno = (d: Date | null) =>
  d ? new Date(`${d.toISOString().slice(0, 10)}T00:00:00Z`) : null;
@Controller('abbonamento')
export class StripeController {
  private readonly logger = new Logger('Abbonamenti');

  constructor(
    private stripeService: StripeService,
    private prisma: PrismaService,
    private notifiche: NotificheService,
  ) {}

  private abbonamentoAttivo(user: JwtPayload) {
    const id = Number(user.sub);
    return this.prisma.abbonamento.findFirst({
      where:
        user.tipo === 'officina'
          ? { id_officina: id, stato: 'attivo' }
          : { id_utente: id, stato: 'attivo' },
      orderBy: { data_inizio: 'desc' },
    });
  }

  /**
   * Piano attivo con rinnovo e date aggiornate da Stripe: `dataFine` è
   * valorizzata solo se il rinnovo automatico è spento (termina quel giorno).
   */
  @UseGuards(JwtAuthGuard)
  @Get('stato')
  async stato(@CurrentUser() user: JwtPayload) {
    const abbonamento = await this.abbonamentoAttivo(user);
    if (!abbonamento) {
      return {
        piano: 'base',
        rinnovoAutomatico: null,
        dataFine: null,
        prossimoRinnovo: null,
        gestibile: false,
      };
    }
    let rinnovo: boolean | null = abbonamento.data_fine ? false : null;
    let prossimo: Date | null = null;
    let dataFine = abbonamento.data_fine;
    if (abbonamento.stripe_subscription_id) {
      try {
        const s = statoRinnovo(
          await this.stripeService.leggi(abbonamento.stripe_subscription_id),
        );
        rinnovo = s.rinnovoAutomatico;
        prossimo = s.rinnovoAutomatico ? s.finePeriodo : null;
        dataFine = aGiorno(s.dataFine);
        if (
          (dataFine?.getTime() ?? null) !==
          (abbonamento.data_fine?.getTime() ?? null)
        ) {
          await this.prisma.abbonamento.update({
            where: { id: abbonamento.id },
            data: { data_fine: dataFine },
          });
        }
      } catch (err) {
        // Stripe non raggiungibile: si usa quello che c'è nel database
        this.logger.warn(
          `Stato Stripe non letto: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return {
      piano: abbonamento.piano,
      rinnovoAutomatico: rinnovo,
      dataFine,
      prossimoRinnovo: prossimo,
      gestibile: Boolean(abbonamento.stripe_subscription_id),
    };
  }

  /** Accende o spegne il rinnovo automatico (la carta resta salvata su Stripe). */
  @UseGuards(JwtAuthGuard)
  @Post('rinnovo')
  async rinnovo(@Body() dto: RinnovoDto, @CurrentUser() user: JwtPayload) {
    const abbonamento = await this.abbonamentoAttivo(user);
    if (!abbonamento?.stripe_subscription_id) {
      throw new BadRequestException('Nessun abbonamento a pagamento attivo');
    }
    const s = await this.stripeService.impostaRinnovo(
      abbonamento.stripe_subscription_id,
      dto.automatico,
    );
    await this.prisma.abbonamento.update({
      where: { id: abbonamento.id },
      data: { data_fine: aGiorno(s.dataFine) },
    });
    return this.stato(user);
  }

  /** Portale Stripe per cambiare carta e scaricare le fatture. */
  @UseGuards(JwtAuthGuard)
  @Post('portale')
  async portale(@Body() dto: PortaleDto, @CurrentUser() user: JwtPayload) {
    const abbonamento = await this.abbonamentoAttivo(user);
    if (!abbonamento?.stripe_subscription_id) {
      throw new BadRequestException('Nessun abbonamento a pagamento attivo');
    }
    const ritorno = `${baseUrlSicuro(dto.baseUrl)}/${user.tipo === 'officina' ? 'abbonamenti-officina' : 'abbonamenti'}`;
    return {
      url: await this.stripeService.portale(
        abbonamento.stripe_subscription_id,
        ritorno,
      ),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(
    @Body() body: { piano: string; baseUrl?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const tipo: 'utente' | 'officina' =
      user.tipo === 'officina' ? 'officina' : 'utente';
    const id = Number(user.sub);

    // un utente ha al massimo un Premium: un secondo checkout addebiterebbe due volte
    const attivo = await this.abbonamentoAttivo(user);
    if (tipo === 'utente' && attivo?.stripe_subscription_id) {
      throw new ConflictException(
        'Hai già Premium: se il rinnovo è spento puoi riattivarlo da Abbonamenti.',
      );
    }

    let email = '';
    if (tipo === 'utente') {
      const utente = await this.prisma.utente.findUnique({
        where: { id },
        select: { email: true },
      });
      email = utente?.email || '';
    } else {
      const officina = await this.prisma.officina.findUnique({
        where: { id },
        select: { email: true },
      });
      email = officina?.email || '';
    }

    const baseUrl = baseUrlSicuro(body.baseUrl);

    const successUrl =
      tipo === 'officina'
        ? `${baseUrl}/pagamento-officina?session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/pagamento?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      tipo === 'officina'
        ? `${baseUrl}/abbonamenti-officina`
        : `${baseUrl}/abbonamenti`;

    const session = await this.stripeService.creaCheckoutSession({
      piano: body.piano,
      tipo,
      id,
      email,
      successUrl,
      cancelUrl,
    });

    return { url: session.url };
  }

  @Post('webhook')
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    let event: StripeWebhookEvent;

    try {
      event = this.stripeService.costruisciEvento(
        req.rawBody!,
        signature,
      ) as StripeWebhookEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      return res.status(400).send(`Webhook Error: ${message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as StripeCheckoutSession;
      const metadata = session.metadata as StripeCheckoutSessionMetadata;
      const { tipo, id } = metadata;
      const piano = metadata.piano as piano_abbonamento;
      const abbonamentoAttivo = await this.prisma.abbonamento.findFirst({
        where:
          tipo === 'utente'
            ? { id_utente: Number(id), stato: 'attivo' }
            : { id_officina: Number(id), stato: 'attivo' },
      });

      if (abbonamentoAttivo) {
        await this.prisma.abbonamento.update({
          where: { id: abbonamentoAttivo.id },
          data: { stato: 'annullato' },
        });
        // cambio di piano: il vecchio abbonamento Stripe si chiude subito
        const vecchio = abbonamentoAttivo.stripe_subscription_id;
        if (vecchio && vecchio !== session.subscription) {
          await this.stripeService
            .chiudiSubito(vecchio)
            .catch((err) =>
              this.logger.error(
                `Vecchio abbonamento ${vecchio} non chiuso su Stripe: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );
        }
      }

      await this.prisma.abbonamento.create({
        data: {
          tipo: tipo === 'utente' ? 'utente' : 'officina',
          piano: piano,
          stato: 'attivo',
          data_inizio: new Date(),
          stripe_subscription_id: session.subscription as string,
          ...(tipo === 'utente'
            ? { id_utente: Number(id) }
            : { id_officina: Number(id) }),
        },
      });
    }

    if (event.type === 'customer.subscription.updated') {
      // rinnovo acceso/spento (anche dal portale Stripe) o pagamenti falliti
      const sub = event.data.object as AbbonamentoStripe;
      const st = statoRinnovo(sub);
      await this.prisma.abbonamento.updateMany({
        where: { stripe_subscription_id: sub.id, stato: 'attivo' },
        data: st.terminato
          ? { stato: 'scaduto' }
          : { data_fine: aGiorno(st.dataFine) },
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as AbbonamentoStripe;
      const righe = await this.prisma.abbonamento.findMany({
        where: { stripe_subscription_id: sub.id, stato: 'attivo' },
        select: { id: true, id_utente: true },
      });
      await this.prisma.abbonamento.updateMany({
        where: { stripe_subscription_id: sub.id, stato: 'attivo' },
        data: { stato: 'scaduto' },
      });
      for (const r of righe) {
        if (r.id_utente) {
          await this.notifiche.avvisaAbbonamento(
            r.id_utente,
            avvisoAbbonamento('terminato', r.id, ''),
          );
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as StripeInvoice;
      const rif = invoice.parent?.subscription_details?.subscription;
      const idSub = typeof rif === 'string' ? rif : rif?.id;
      const riga = idSub
        ? await this.prisma.abbonamento.findFirst({
            where: { stripe_subscription_id: idSub, stato: 'attivo' },
            select: { id: true, id_utente: true },
          })
        : null;
      if (riga?.id_utente) {
        await this.notifiche.avvisaAbbonamento(
          riga.id_utente,
          avvisoAbbonamento(
            'pagamento_fallito',
            riga.id,
            String(invoice.period_end ?? ''),
          ),
        );
      }
    }

    res.status(200).json({ received: true });
  }
  /**
   * "Passa a Gratis": con un abbonamento Stripe spegne il rinnovo (resta
   * attivo fino a fine periodo pagato e non viene più addebitato); senza
   * abbonamento Stripe (righe create a mano) lo chiude subito.
   */
  @UseGuards(JwtAuthGuard)
  @Post('disdici')
  async disdici(@CurrentUser() user: JwtPayload) {
    const abbonamentoAttivo = await this.abbonamentoAttivo(user);
    if (!abbonamentoAttivo) {
      return { message: 'Nessun abbonamento attivo' };
    }

    if (abbonamentoAttivo.stripe_subscription_id) {
      const s = await this.stripeService.impostaRinnovo(
        abbonamentoAttivo.stripe_subscription_id,
        false,
      );
      await this.prisma.abbonamento.update({
        where: { id: abbonamentoAttivo.id },
        data: { data_fine: aGiorno(s.dataFine) },
      });
      return {
        message: 'Rinnovo disattivato',
        dataFine: aGiorno(s.dataFine),
      };
    }

    await this.prisma.abbonamento.update({
      where: { id: abbonamentoAttivo.id },
      data: { stato: 'annullato' },
    });
    return { message: 'Abbonamento disdetto' };
  }
}
