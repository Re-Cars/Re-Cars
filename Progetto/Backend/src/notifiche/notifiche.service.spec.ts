import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma.service';
import { NotificheService } from './notifiche.service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

const inviaMock = webpush.sendNotification as jest.Mock;

function crea(conChiavi = true) {
  const prisma = {
    push_iscrizione: {
      findMany: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    notifica_inviata: { findUnique: jest.fn(), create: jest.fn() },
    veicolo: { findMany: jest.fn().mockResolvedValue([]) },
    prenotazione: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const env: Record<string, string> = conChiavi
    ? { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv' }
    : {};
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  const service = new NotificheService(
    prisma as unknown as PrismaService,
    config,
  );
  return { prisma, service };
}

const iscrizione = {
  id: 1,
  endpoint: 'https://push.example/a',
  p256dh: 'k',
  auth: 'a',
};

describe('NotificheService', () => {
  beforeEach(() => inviaMock.mockReset());

  it('senza chiavi VAPID non invia nulla', async () => {
    const { service, prisma } = crea(false);
    expect(service.attive).toBe(false);
    await expect(
      service.inviaAUtente(7, { titolo: 't', testo: 'x', url: '/' }),
    ).resolves.toBe(0);
    expect(prisma.push_iscrizione.findMany).not.toHaveBeenCalled();
  });

  it('elimina le iscrizioni revocate dal browser (410)', async () => {
    const { service, prisma } = crea();
    prisma.push_iscrizione.findMany.mockResolvedValue([
      iscrizione,
      { ...iscrizione, id: 2, endpoint: 'https://push.example/b' },
    ]);
    inviaMock
      .mockRejectedValueOnce(
        Object.assign(new Error('gone'), { statusCode: 410 }),
      )
      .mockResolvedValueOnce({});
    await expect(
      service.inviaAUtente(7, { titolo: 't', testo: 'x', url: '/' }),
    ).resolves.toBe(1);
    expect(prisma.push_iscrizione.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('il controllo giornaliero non rimanda una scadenza già avvisata', async () => {
    const { service, prisma } = crea();
    prisma.push_iscrizione.findMany.mockImplementation(
      (args: { distinct?: string[] }) =>
        Promise.resolve(args?.distinct ? [{ id_utente: 7 }] : [iscrizione]),
    );
    prisma.veicolo.findMany.mockResolvedValue([
      {
        id: 3,
        targa: 'AB123CD',
        marca: 'Fiat',
        modello: 'Panda',
        dati_specifici: [
          {
            dataimmatricolazione: null,
            datascadenzabollo: new Date('2026-10-05T00:00:00Z'),
            datascadenzarca: null,
          },
        ],
      },
    ]);
    inviaMock.mockResolvedValue({});
    const adesso = new Date('2026-09-28T07:00:00Z');

    prisma.notifica_inviata.findUnique.mockResolvedValueOnce(null);
    await expect(service.controlloGiornaliero(adesso)).resolves.toEqual({
      utenti: 1,
      scadenze: 1,
      promemoria: 0,
    });
    expect(prisma.notifica_inviata.create).toHaveBeenCalledWith({
      data: { id_utente: 7, chiave: 'bollo:3:2026-10-05:7' },
    });

    prisma.notifica_inviata.findUnique.mockResolvedValueOnce({ id: 1 });
    await expect(service.controlloGiornaliero(adesso)).resolves.toEqual({
      utenti: 1,
      scadenze: 0,
      promemoria: 0,
    });
    expect(inviaMock).toHaveBeenCalledTimes(1);
  });
});
