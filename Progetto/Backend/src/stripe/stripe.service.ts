import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

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
    const priceMap: Record<string, string> = {
      premium:               this.config.get<string>('STRIPE_PRICE_PREMIUM')!,
      pro:                   this.config.get<string>('STRIPE_PRICE_PRO')!,
      officina_business:     this.config.get<string>('STRIPE_PRICE_BUSINESS')!,
      officina_business_pro: this.config.get<string>('STRIPE_PRICE_BUSINESS_PRO')!,
    };

    const priceId = priceMap[params.piano];
    if (!priceId) throw new Error(`Piano non valido: ${params.piano}`);

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

  costruisciEvento(payload: Buffer, signature: string): object {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.get<string>('STRIPE_WEBHOOK_SECRET')!,
    );
  }
}