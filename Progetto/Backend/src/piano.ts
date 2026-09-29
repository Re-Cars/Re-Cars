import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from './prisma.service';

/**
 * Piani utente: Gratis ("base") e Premium. Il vecchio piano "pro" e i
 * piani azienda contano come Premium (nessuna migrazione: l'enum resta).
 */
export type Piano = 'base' | 'premium';

export const LIMITE_VEICOLI: Record<Piano, number> = {
  base: 1,
  premium: Infinity,
};

export async function pianoUtente(
  prisma: PrismaService,
  idUtente: number,
): Promise<Piano> {
  const abbonamento = await prisma.abbonamento.findFirst({
    where: { id_utente: idUtente, stato: 'attivo' },
    orderBy: { data_inizio: 'desc' },
  });
  const piano = abbonamento?.piano;
  // rinnovo spento e periodo pagato finito: Gratis anche prima che il
  // controllo giornaliero lo segni come scaduto
  const finito =
    abbonamento?.data_fine &&
    abbonamento.data_fine.getTime() <
      Date.parse(new Date().toISOString().slice(0, 10));
  return piano && piano !== 'base' && !piano.startsWith('officina') && !finito
    ? 'premium'
    : 'base';
}

/** Blocca le funzioni Premium per chi ha il piano Gratis (403 con messaggio leggibile). */
export async function richiediPremium(
  prisma: PrismaService,
  idUtente: number,
  funzione: string,
): Promise<void> {
  if ((await pianoUtente(prisma, idUtente)) !== 'premium') {
    throw new ForbiddenException(
      `${funzione} è incluso nel piano Premium: puoi attivarlo da Abbonamenti.`,
    );
  }
}
