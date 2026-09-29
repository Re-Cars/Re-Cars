import { ForbiddenException } from '@nestjs/common';
import { LIMITE_VEICOLI, pianoUtente, richiediPremium } from './piano';
import type { PrismaService } from './prisma.service';

const conAbbonamento = (piano: string | null) =>
  ({
    abbonamento: {
      findFirst: jest.fn().mockResolvedValue(piano ? { piano } : null),
    },
  }) as unknown as PrismaService;

describe('piani Gratis / Premium', () => {
  it('senza abbonamento attivo il piano è Gratis', async () => {
    expect(await pianoUtente(conAbbonamento(null), 1)).toBe('base');
    expect(await pianoUtente(conAbbonamento('base'), 1)).toBe('base');
  });

  it('premium, il vecchio pro e i piani azienda contano come Premium', async () => {
    for (const piano of ['premium', 'pro', 'azienda_business']) {
      expect(await pianoUtente(conAbbonamento(piano), 1)).toBe('premium');
    }
  });

  it('i piani officina non sbloccano le funzioni utente', async () => {
    expect(await pianoUtente(conAbbonamento('officina_business'), 1)).toBe(
      'base',
    );
  });

  it('richiediPremium blocca il piano Gratis con un messaggio leggibile', async () => {
    await expect(
      richiediPremium(conAbbonamento(null), 1, 'La ricerca dalla targa'),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      richiediPremium(conAbbonamento('premium'), 1, 'La ricerca dalla targa'),
    ).resolves.toBeUndefined();
  });

  it('Gratis ha 1 veicolo, Premium illimitati', () => {
    expect(LIMITE_VEICOLI.base).toBe(1);
    expect(LIMITE_VEICOLI.premium).toBe(Infinity);
  });

  it('un Premium con rinnovo spento vale fino alla data di fine', async () => {
    const con = (data_fine: Date) =>
      ({
        abbonamento: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ piano: 'premium', data_fine }),
        },
      }) as unknown as PrismaService;
    const domani = new Date(Date.now() + 86_400_000);
    const ieri = new Date(Date.now() - 2 * 86_400_000);
    expect(await pianoUtente(con(domani), 1)).toBe('premium');
    expect(await pianoUtente(con(ieri), 1)).toBe('base');
  });
});
