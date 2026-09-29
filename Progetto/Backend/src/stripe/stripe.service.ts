import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/** Campi dell'abbonamento Stripe che servono qui (stessi nomi dell'API). */
export interface AbbonamentoStripe {
  id: string;
  status: string;
  customer: string | { id: string };
  cancel_at_period_end: boolean;
  cancel_at: number | null;
  /** Dal 2025 la fine del periodo sta sulle voci dell'abbonamento. */
  items?: { data?: { current_period_end?: number }[] };
  current_period_end?: number;
}

export interface StatoRinnovo {
  /** true: Stripe addebita e rinnova da solo a fine mese. */
  rinnovoAutomatico: boolean;
  /** Fine del periodo pagato (= prossimo rinnovo se automatico). */
  finePeriodo: Date | null;
  /** Data in cui l'abbonamento termina (null se si rinnova). */
  dataFine: Date | null;
  /** Stati Stripe in cui il servizio non è più pagato. */
  terminato: boolean;
}

const daSecondi = (s: number | null | undefined) =>
  s ? new Date(s * 1000) : null;

/** Rinnovo e date di un abbonamento Stripe (funzione pura, testabile). */
export function statoRinnovo(sub: AbbonamentoStripe): StatoRinnovo {
  const fine = daSecondi(
    sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end,
  );
  const disdetto = sub.cancel_at_period_end || sub.cancel_at !== null;
  return {
    rinnovoAutomatico: !disdetto,
    finePeriodo: fine,
    dataFine: disdetto ? (daSecondi(sub.cancel_at) ?? fine) : null,
    terminato: ['canceled', 'unpaid', 'incomplete_expired'].includes(
      sub.status,
    ),
  };
}

@Injectable()
export class StripeService {
  private stripe: InstanceType<typeof Stripe>;

  constructor(private config: ConfigService) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY')!, {
      apiVersion: '2026-05-27.dahlia',
    });
  }

  async creaCheckoutSession(params: {
    piano: string;
    tipo: 'utente' | 'officina';
    id: number;
    email: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string | null }> {
    // utenti: solo Premium (il vecchio "pro" non si vende più)
    const priceMap: Record<string, string> = {
      premium: this.config.get<string>('STRIPE_PRICE_PREMIUM')!,
      officina_business: this.config.get<string>('STRIPE_PRICE_BUSINESS')!,
      officina_business_pro: this.config.get<string>(
        'STRIPE_PRICE_BUSINESS_PRO',
      )!,
    };

    const priceId = priceMap[params.piano];
    if (!priceId)
      throw new BadRequestException(`Piano non valido: ${params.piano}`);

    // mode "subscription": la carta resta salvata e Stripe rinnova ogni mese
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: params.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        piano: params.piano,
        tipo: params.tipo,
        id: String(params.id),
      },
    });

    return { url: session.url };
  }

  async leggi(idAbbonamento: string): Promise<AbbonamentoStripe> {
    return await this.stripe.subscriptions.retrieve(idAbbonamento);
  }

  /** Rinnovo automatico acceso/spento: spento = termina a fine periodo pagato. */
  async impostaRinnovo(
    idAbbonamento: string,
    automatico: boolean,
  ): Promise<StatoRinnovo> {
    const sub = (await this.stripe.subscriptions.update(idAbbonamento, {
      cancel_at_period_end: !automatico,
    })) as unknown as AbbonamentoStripe;
    return statoRinnovo(sub);
  }

  /** Chiusura immediata (cambio di piano officina: niente doppio addebito). */
  async chiudiSubito(idAbbonamento: string): Promise<void> {
    await this.stripe.subscriptions.cancel(idAbbonamento);
  }

  /** Pagina Stripe per cambiare carta e vedere le fatture. */
  async portale(idAbbonamento: string, ritorno: string): Promise<string> {
    const sub = await this.leggi(idAbbonamento);
    const customer =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const sessione = await this.stripe.billingPortal.sessions.create({
      customer,
      return_url: ritorno,
    });
    return sessione.url;
  }

  costruisciEvento(payload: Buffer, signature: string): object {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.get<string>('STRIPE_WEBHOOK_SECRET')!,
    );
  }
}
