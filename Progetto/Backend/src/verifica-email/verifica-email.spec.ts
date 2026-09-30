import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { MailerService } from '@nestjs-modules/mailer';
import { promises as dns } from 'dns';

import type { PrismaService } from '../prisma.service';
import { motivoEmailNonValida } from './indirizzo';
import { VerificaEmailService } from './verifica-email.service';

describe('indirizzi email', () => {
  it('accetta indirizzi normali', () => {
    for (const e of [
      'mario.rossi@gmail.com',
      'Info@Officina-Rossi.it',
      'salvatore90@outlook.it',
    ]) {
      expect(motivoEmailNonValida(e)).toBeNull();
    }
  });

  it('rifiuta segnaposto come email@gmail.com e test1@...', () => {
    for (const e of [
      'email@gmail.com',
      'test1@gmail.com',
      'prova@libero.it',
      'nome.cognome@gmail.com',
    ]) {
      expect(motivoEmailNonValida(e)).toMatch(/reale/);
    }
  });

  it('rifiuta domini di esempio e usa-e-getta', () => {
    expect(motivoEmailNonValida('mario@example.com')).toMatch(/dominio/);
    expect(motivoEmailNonValida('mario@yopmail.com')).toMatch(/dominio/);
    expect(motivoEmailNonValida('mario@gmail')).toMatch(/valido/);
  });
});

describe('VerificaEmailService', () => {
  const crea = (registrata = false) => {
    const prisma = {
      utente: {
        findUnique: jest.fn().mockResolvedValue(registrata ? { id: 1 } : null),
      },
      officina: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const mailer = { sendMail: jest.fn().mockResolvedValue({}) };
    const service = new VerificaEmailService(
      prisma as unknown as PrismaService,
      mailer as unknown as MailerService,
    );
    return { service, mailer };
  };
  const codiceInviato = (mailer: { sendMail: jest.Mock }) => {
    const chiamate = mailer.sendMail.mock.calls as [{ subject: string }][];
    return /(\d{6}) è il tuo codice/.exec(chiamate[0][0].subject)![1];
  };

  beforeEach(() => {
    jest
      .spyOn(dns, 'resolveMx')
      .mockResolvedValue([{ exchange: 'mx.gmail.com', priority: 1 }]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('manda un codice e lo accetta una volta sola', async () => {
    const { service, mailer } = crea();
    await service.inviaCodice('Mario.Rossi@gmail.com');
    const codice = codiceInviato(mailer);
    expect(() =>
      service.verifica('mario.rossi@gmail.com', codice),
    ).not.toThrow();
    expect(() => service.verifica('mario.rossi@gmail.com', codice)).toThrow(
      /scaduto/,
    );
  });

  it('senza codice o con codice sbagliato non si registra', async () => {
    const { service } = crea();
    await service.inviaCodice('mario.rossi@gmail.com');
    expect(() => service.verifica('mario.rossi@gmail.com', undefined)).toThrow(
      BadRequestException,
    );
    expect(() => service.verifica('mario.rossi@gmail.com', '000000')).toThrow(
      /non corretto/,
    );
  });

  it('email già registrata: 409', async () => {
    const { service } = crea(true);
    await expect(service.inviaCodice('mario.rossi@gmail.com')).rejects.toThrow(
      ConflictException,
    );
  });

  it('dominio senza posta: rifiutato', async () => {
    jest
      .spyOn(dns, 'resolveMx')
      .mockRejectedValue(Object.assign(new Error('x'), { code: 'ENOTFOUND' }));
    const { service } = crea();
    await expect(
      service.inviaCodice('mario@dominio-inesistente-xyz.it'),
    ).rejects.toThrow(/non può ricevere/);
  });

  it('email non partita: 503 e nessun codice salvato', async () => {
    const { service, mailer } = crea();
    mailer.sendMail.mockRejectedValue(new Error('smtp'));
    await expect(service.inviaCodice('mario.rossi@gmail.com')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(() => service.verifica('mario.rossi@gmail.com', '123456')).toThrow(
      /scaduto/,
    );
  });

  it('niente secondo codice entro un minuto', async () => {
    const { service } = crea();
    await service.inviaCodice('mario.rossi@gmail.com');
    await expect(service.inviaCodice('mario.rossi@gmail.com')).rejects.toThrow(
      /aspetta un minuto/,
    );
  });
});
