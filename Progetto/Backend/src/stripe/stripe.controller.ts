import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
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

interface StripeSubscriptionObject {
  id: string;
}

interface StripeWebhookEvent {
  type: string;
  data: {
    object: StripeCheckoutSession | StripeSubscriptionObject;
  };
}
@Controller('abbonamento')
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(
    @Body() body: { piano: string; baseUrl?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const tipo: 'utente' | 'officina' =
      user.tipo === 'officina' ? 'officina' : 'utente';
    const id = Number(user.sub);

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

    let baseUrl =
      process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:5500/Frontend';
    if (body.baseUrl) {
      try {
        const parsed = new URL(body.baseUrl);
        const configuredUrl = process.env.FRONTEND_BASE_URL
          ? new URL(process.env.FRONTEND_BASE_URL)
          : null;
        if (
          parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1' ||
          (configuredUrl && parsed.hostname === configuredUrl.hostname)
        ) {
          baseUrl = body.baseUrl.replace(/\/+$/, '');
        }
      } catch {
        // Fallback su baseUrl predefinito se formato URL non valido
      }
    }

    const successUrl =
      tipo === 'officina'
        ? `${baseUrl}/pagamento-officina.html?session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/pagamento.html?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      tipo === 'officina'
        ? `${baseUrl}/abbonamenti-officina.html`
        : `${baseUrl}/abbonamenti.html`;

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

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as StripeSubscriptionObject;
      await this.prisma.abbonamento.updateMany({
        where: { stripe_subscription_id: subscription.id },
        data: { stato: 'annullato' },
      });
    }

    res.status(200).json({ received: true });
  }
  @UseGuards(JwtAuthGuard)
  @Post('disdici')
  async disdici(@CurrentUser() user: JwtPayload) {
    const tipo: 'utente' | 'officina' =
      user.tipo === 'officina' ? 'officina' : 'utente';
    const id = Number(user.sub);

    const abbonamentoAttivo = await this.prisma.abbonamento.findFirst({
      where:
        tipo === 'utente'
          ? { id_utente: id, stato: 'attivo' }
          : { id_officina: id, stato: 'attivo' },
    });

    if (!abbonamentoAttivo) {
      return { message: 'Nessun abbonamento attivo' };
    }

    await this.prisma.abbonamento.update({
      where: { id: abbonamentoAttivo.id },
      data: { stato: 'annullato' },
    });

    return { message: 'Abbonamento disdetto' };
  }
}
