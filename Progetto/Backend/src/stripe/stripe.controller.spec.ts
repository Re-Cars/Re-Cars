import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import request from 'supertest';

import { JwtAuthGuard } from '../jwt-auth.guard';
import { NotificheService } from '../notifiche/notifiche.service';
import { PrismaService } from '../prisma.service';
import { StripeController } from './stripe.controller';
import { StripeService, statoRinnovo } from './stripe.service';

const giorno = (iso: string) => new Date(`${iso}T00:00:00Z`);
const secondi = (iso: string) => Date.parse(`${iso}T10:00:00Z`) / 1000;

describe('statoRinnovo', () => {
  const base = {
    id: 'sub_1',
    status: 'active',
    customer: 'cus_1',
    cancel_at: null,
    items: { data: [{ current_period_end: secondi('2026-10-28') }] },
  };

  it('rinnovo acceso: nessuna data di fine, prossimo rinnovo dal periodo', () => {
    const s = statoRinnovo({ ...base, cancel_at_period_end: false });
    expect(s.rinnovoAutomatico).toBe(true);
    expect(s.dataFine).toBeNull();
    expect(s.finePeriodo?.toISOString().slice(0, 10)).toBe('2026-10-28');
  });

  it('rinnovo spento: termina a fine periodo pagato', () => {
    const s = statoRinnovo({ ...base, cancel_at_period_end: true });
    expect(s.rinnovoAutomatico).toBe(false);
    expect(s.dataFine?.toISOString().slice(0, 10)).toBe('2026-10-28');
  });

  it('stati Stripe non pagati contano come terminati', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete_expired']) {
      expect(
        statoRinnovo({ ...base, status, cancel_at_period_end: false })
          .terminato,
      ).toBe(true);
    }
    expect(
      statoRinnovo({ ...base, status: 'past_due', cancel_at_period_end: false })
        .terminato,
    ).toBe(false);
  });
});

describe('StripeController (abbonamenti)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer() as Server;
  let prisma: {
    abbonamento: Record<string, jest.Mock>;
    utente: Record<string, jest.Mock>;
  };
  let stripe: Record<string, jest.Mock>;
  let notifiche: { avvisaAbbonamento: jest.Mock };
  const attivo = {
    id: 9,
    piano: 'premium',
    stato: 'attivo',
    data_fine: null as Date | null,
    stripe_subscription_id: 'sub_9',
    id_utente: 7,
  };

  beforeEach(async () => {
    prisma = {
      abbonamento: {
        findFirst: jest.fn().mockResolvedValue({ ...attivo }),
        findMany: jest.fn().mockResolvedValue([{ id: 9, id_utente: 7 }]),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      utente: { findUnique: jest.fn().mockResolvedValue({ email: 'u@x.it' }) },
    };
    const periodo = {
      status: 'active',
      customer: 'cus_1',
      cancel_at: null,
      items: { data: [{ current_period_end: secondi('2026-10-28') }] },
    };
    stripe = {
      leggi: jest.fn().mockResolvedValue({
        id: 'sub_9',
        cancel_at_period_end: false,
        ...periodo,
      }),
      impostaRinnovo: jest.fn((id: string, automatico: boolean) =>
        Promise.resolve(
          statoRinnovo({ id, cancel_at_period_end: !automatico, ...periodo }),
        ),
      ),
      creaCheckoutSession: jest.fn(),
      costruisciEvento: jest.fn(),
      chiudiSubito: jest.fn(),
      portale: jest.fn().mockResolvedValue('https://billing.stripe.com/p/x'),
    };
    notifiche = { avvisaAbbonamento: jest.fn() };

    const modulo = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        { provide: StripeService, useValue: stripe },
        { provide: PrismaService, useValue: prisma },
        { provide: NotificheService, useValue: notifiche },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => { user?: unknown } };
        }) => {
          ctx.switchToHttp().getRequest().user = {
            sub: '7',
            email: 'u@x.it',
            tipo: 'privato',
          };
          return true;
        },
      })
      .compile();
    app = modulo.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => app.close());

  it('stato: rinnovo automatico e prossimo rinnovo letti da Stripe', async () => {
    const res = await request(server()).get('/abbonamento/stato').expect(200);
    expect(res.body).toMatchObject({
      piano: 'premium',
      rinnovoAutomatico: true,
      dataFine: null,
      gestibile: true,
    });
    const body = res.body as { prossimoRinnovo: string };
    expect(body.prossimoRinnovo.slice(0, 10)).toBe('2026-10-28');
  });

  it('spegnere il rinnovo lo spegne su Stripe e salva la data di fine', async () => {
    await request(server())
      .post('/abbonamento/rinnovo')
      .send({ automatico: false })
      .expect(201);
    expect(stripe.impostaRinnovo).toHaveBeenCalledWith('sub_9', false);
    expect(prisma.abbonamento.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { data_fine: giorno('2026-10-28') },
    });
  });

  it('rinnovo: il corpo deve essere un booleano', async () => {
    await request(server())
      .post('/abbonamento/rinnovo')
      .send({ automatico: 'forse' })
      .expect(400);
  });

  it('passa a Gratis non chiude subito: spegne il rinnovo su Stripe', async () => {
    const res = await request(server())
      .post('/abbonamento/disdici')
      .expect(201);
    expect(stripe.impostaRinnovo).toHaveBeenCalledWith('sub_9', false);
    expect(prisma.abbonamento.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { stato: 'annullato' } }),
    );
    expect((res.body as { message: string }).message).toBe(
      'Rinnovo disattivato',
    );
  });

  it('non si compra un secondo Premium', async () => {
    await request(server())
      .post('/abbonamento/checkout')
      .send({ piano: 'premium' })
      .expect(409);
    expect(stripe.creaCheckoutSession).not.toHaveBeenCalled();
  });

  it('webhook: abbonamento terminato su Stripe → scaduto e avviso', async () => {
    stripe.costruisciEvento.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_9' } },
    });
    await request(server())
      .post('/abbonamento/webhook')
      .set('stripe-signature', 'x')
      .send({})
      .expect(200);
    expect(prisma.abbonamento.updateMany).toHaveBeenCalledWith({
      where: { stripe_subscription_id: 'sub_9', stato: 'attivo' },
      data: { stato: 'scaduto' },
    });
    expect(notifiche.avvisaAbbonamento).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ chiave: 'abbonamento:9:terminato' }),
    );
  });

  it("webhook: pagamento del rinnovo fallito → avviso all'utente", async () => {
    stripe.costruisciEvento.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          period_end: 1790000000,
          parent: { subscription_details: { subscription: 'sub_9' } },
        },
      },
    });
    await request(server())
      .post('/abbonamento/webhook')
      .set('stripe-signature', 'x')
      .send({})
      .expect(200);
    expect(notifiche.avvisaAbbonamento).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ chiave: 'abbonamento:9:pagamento:1790000000' }),
    );
  });

  it('webhook: rinnovo spento dal portale Stripe → data di fine salvata', async () => {
    stripe.costruisciEvento.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_9',
          status: 'active',
          customer: 'cus_1',
          cancel_at_period_end: true,
          cancel_at: null,
          items: { data: [{ current_period_end: secondi('2026-10-28') }] },
        },
      },
    });
    await request(server())
      .post('/abbonamento/webhook')
      .set('stripe-signature', 'x')
      .send({})
      .expect(200);
    expect(prisma.abbonamento.updateMany).toHaveBeenCalledWith({
      where: { stripe_subscription_id: 'sub_9', stato: 'attivo' },
      data: { data_fine: giorno('2026-10-28') },
    });
  });
});
