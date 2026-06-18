import {
  Controller, Post, Body, Req, Res, Headers, UseGuards,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { Request, Response } from 'express';

@Controller('abbonamento')
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(
    @Body() body: { piano: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const tipo: 'utente' | 'officina' = user.tipo === 'officina' ? 'officina' : 'utente';
    const id = Number(user.sub);

    let email = '';
    if (tipo === 'utente') {
      const utente = await this.prisma.utente.findUnique({ where: { id }, select: { email: true } });
      email = utente?.email || '';
    } else {
      const officina = await this.prisma.officina.findUnique({ where: { id }, select: { email: true } });
      email = officina?.email || '';
    }

    const baseUrl = 'http://127.0.0.1:5500/Progetto/Frontend';

    const session = await this.stripeService.creaCheckoutSession({
      piano: body.piano,
      tipo,
      id,
      email,
      successUrl: `${baseUrl}/pagamento.html?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/abbonamenti.html`,
    });

    return { url: session.url };
  }

  @Post('webhook')
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    let event: any;

    try {
      event = this.stripeService.costruisciEvento(req.rawBody!, signature);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { piano, tipo, id } = session.metadata;

      const abbonamentoAttivo = await this.prisma.abbonamento.findFirst({
        where: tipo === 'utente'
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
          piano: piano as any,
          stato: 'attivo',
          data_inizio: new Date(),
          stripe_subscription_id: session.subscription,
          ...(tipo === 'utente'
            ? { id_utente: Number(id) }
            : { id_officina: Number(id) }),
        },
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await this.prisma.abbonamento.updateMany({
        where: { stripe_subscription_id: subscription.id },
        data: { stato: 'annullato' },
      });
    }

    res.status(200).json({ received: true });
  }

  @UseGuards(JwtAuthGuard)
    @Post('disdici')
    async disdici(@Req() req: Request) {
    const user = (req as any).user;
    const tipo: 'utente' | 'officina' = user.tipo === 'officina' ? 'officina' : 'utente';
    const id = Number(user.sub);

    const abbonamentoAttivo = await this.prisma.abbonamento.findFirst({
        where: tipo === 'utente'
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