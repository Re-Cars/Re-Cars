import { AssistenteService, type EventoAssistente } from './assistente.service';
import {
  GeminiErrore,
  GeminiNonConfigurato,
  GeminiQuotaEsaurita,
  type GeminiClient,
} from './gemini.client';
import type { PrismaService } from '../prisma.service';

function prismaFinto(): PrismaService {
  return {
    veicolo: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          targa: 'AB123CD',
          marca: 'Fiat',
          modello: 'Panda',
          dati_generici: [
            {
              tipo_veicolo: 'Auto',
              alimentazione: 'Benzina',
              cilindrata: '1242',
            },
          ],
          dati_specifici: [
            {
              dataimmatricolazione: new Date('2019-03-12'),
              datascadenzabollo: new Date('2026-10-10'),
              isbolloattivo: true,
              datascadenzarca: new Date('2026-08-01'),
              isinsured: true,
              nomeassicurazione: 'UnipolSai',
            },
          ],
        },
      ]),
    },
    prenotazione: { findMany: jest.fn().mockResolvedValue([]) },
    abbonamento: {
      findFirst: jest.fn().mockResolvedValue({ piano: 'premium' }),
    },
  } as unknown as PrismaService;
}

function geminiCon(pezzi: string[] | Error): GeminiClient {
  return {
    configurato: true,
    async *stream() {
      await Promise.resolve();
      if (pezzi instanceof Error) throw pezzi;
      for (const p of pezzi) yield p;
    },
  } as unknown as GeminiClient;
}

async function raccogli(
  gen: AsyncGenerator<EventoAssistente>,
): Promise<EventoAssistente[]> {
  const eventi: EventoAssistente[] = [];
  for await (const e of gen) eventi.push(e);
  return eventi;
}

describe('AssistenteService', () => {
  it('mette nel contesto le scadenze reali, anche quelle già passate', async () => {
    const service = new AssistenteService(prismaFinto(), geminiCon([]));
    const contesto = await service.contesto(7, new Date('2026-09-25T10:00:00'));
    expect(contesto).toContain('Fiat Panda');
    expect(contesto).toContain('bollo scade il 10/10/2026');
    expect(contesto).toContain('assicurazione UnipolSai SCADUTA');
    expect(contesto).toContain('Piano: premium');
  });

  it('manda il testo a pezzi e alla fine le azioni validate', async () => {
    const service = new AssistenteService(
      prismaFinto(),
      geminiCon([
        '{"risposta": "Il bollo ',
        'scade il 10/10.", "azioni": [{"tipo":"apri_pagina","etichetta":"Vai","valore":"dashboard"},',
        '{"tipo":"apri_pagina","etichetta":"X","valore":"https://evil.example"}]}',
      ]),
    );
    const eventi = await raccogli(
      service.rispondi(7, { messaggio: 'Quando scade il bollo?' }),
    );
    const testo = eventi
      .filter((e) => e.type === 'delta')
      .map((e) => (e.type === 'delta' ? e.text : ''))
      .join('');
    expect(testo).toBe('Il bollo scade il 10/10.');
    expect(eventi.at(-1)).toEqual({
      type: 'done',
      answer: 'Il bollo scade il 10/10.',
      actions: [{ tipo: 'apri_pagina', etichetta: 'Vai', href: '/homepage' }],
      used_llm: true,
    });
  });

  it.each([
    ['quota esaurita', new GeminiQuotaEsaurita('429'), 'limite di richieste'],
    [
      'chiave mancante',
      new GeminiNonConfigurato('no key'),
      'non è disponibile',
    ],
    ['errore di rete', new GeminiErrore('rete'), 'non è disponibile'],
  ])(
    'con %s risponde con un messaggio di ripiego',
    async (_nome, errore, frammento) => {
      const service = new AssistenteService(prismaFinto(), geminiCon(errore));
      const eventi = await raccogli(service.rispondi(7, { messaggio: 'ciao' }));
      expect(eventi).toHaveLength(1);
      const fine = eventi[0];
      expect(fine.type).toBe('done');
      if (fine.type === 'done') {
        expect(fine.used_llm).toBe(false);
        expect(fine.answer).toContain(frammento);
        expect(fine.actions[0]).toMatchObject({ href: '/info-domande' });
      }
    },
  );
});
