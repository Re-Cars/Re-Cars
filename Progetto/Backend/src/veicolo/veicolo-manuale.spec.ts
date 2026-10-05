import { ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateVeicoloManualeDto,
  UpdateVeicoloManualeDto,
} from './dto/create-veicolo-manuale.dto';
import { VeicoloService } from './veicolo.service';
import { PrismaService } from '../prisma.service';

const base = {
  targa: 'ab 123 cd',
  tipo_veicolo: 'Autovettura',
  marca: ' Mercedes-Benz ',
  modello: 'Classe A 180 d Automatic',
  dataimmatricolazione: '2019-03-12',
  alimentazione: 'Diesel',
  cilindrata: 1461,
  potenza_kw: 85,
  numporte: 5,
  nomeassicurazione: 'UnipolSai',
  datascadenzarca: '2027-02-01',
};

async function errori(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateVeicoloManualeDto, body);
  return { dto, errori: await validate(dto) };
}

describe('CreateVeicoloManualeDto', () => {
  it('accetta i dati del libretto e normalizza targa e testi', async () => {
    const { dto, errori: e } = await errori(base);
    expect(e).toHaveLength(0);
    expect(dto.targa).toBe('AB123CD');
    expect(dto.marca).toBe('Mercedes-Benz');
  });

  it('accetta la targa delle moto', async () => {
    const { errori: e } = await errori({ ...base, targa: 'AB12345' });
    expect(e).toHaveLength(0);
  });

  it.each([
    ['targa', 'A123BCD'],
    ['tipo_veicolo', 'Bicicletta'],
    ['alimentazione', 'Carbone'],
    ['dataimmatricolazione', 'ieri'],
    ['marca', 'x'.repeat(31)],
  ])('rifiuta %s non valido', async (campo, valore) => {
    const { errori: e } = await errori({ ...base, [campo]: valore });
    expect(e.map((x) => x.property)).toContain(campo);
  });
});

describe('VeicoloService.salvaManuale', () => {
  const tx = {
    veicolo: { create: jest.fn().mockResolvedValue({ id: 9 }) },
    dati_generici: { create: jest.fn() },
    dati_specifici: { create: jest.fn() },
    storico_intervento: { createMany: jest.fn() },
  };
  const prisma = {
    veicolo: { findFirst: jest.fn(), count: jest.fn() },
    abbonamento: { findFirst: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new VeicoloService(
    prisma as unknown as PrismaService,
    {} as JwtService,
  );
  const dto = plainToInstance(CreateVeicoloManualeDto, base);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.veicolo.findFirst.mockResolvedValue(null);
    prisma.veicolo.count.mockResolvedValue(0);
    prisma.abbonamento.findFirst.mockResolvedValue(null);
  });

  it('salva veicolo, dati generici (kW → CV) e scadenze', async () => {
    await expect(service.salvaManuale(dto, 7)).resolves.toEqual({ id: 9 });
    expect(tx.veicolo.create).toHaveBeenCalledWith({
      data: {
        targa: 'AB123CD',
        marca: 'Mercedes-Benz',
        modello: 'Classe A 180 d Automatic',
        id_utente: 7,
      },
    });
    expect(tx.dati_generici.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo_veicolo: 'Autovettura',
        cavalli: 116,
        cilindrata: '1461',
        numporte: '5',
        id_veicolo: 9,
      }) as unknown,
    });
    expect(tx.dati_specifici.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isinsured: true,
        isbolloattivo: null,
        datascadenzabollo: null,
      }) as unknown,
    });
    expect(tx.storico_intervento.createMany).not.toHaveBeenCalled();
  });

  it('ultima revisione e ultimo tagliando diventano interventi dello storico', async () => {
    const conDate = plainToInstance(CreateVeicoloManualeDto, {
      ...base,
      ultimarevisione: '2024-05-03',
      ultimotagliando: '2025-11-20',
    });
    await service.salvaManuale(conDate, 7);
    expect(tx.storico_intervento.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          tipo: 'Revisione',
          categoria: 'gestione',
          data: new Date('2024-05-03'),
          id_veicolo: 9,
        }),
        expect.objectContaining({
          tipo: 'Tagliando',
          categoria: 'ordinario',
          data: new Date('2025-11-20'),
          id_veicolo: 9,
        }),
      ],
    });
  });

  it('rifiuta una targa già presente', async () => {
    prisma.veicolo.findFirst.mockResolvedValue({ id: 1 });
    await expect(service.salvaManuale(dto, 7)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rispetta il limite del piano base (1 veicolo)', async () => {
    prisma.veicolo.count.mockResolvedValue(1);
    await expect(service.salvaManuale(dto, 7)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('VeicoloService.aggiornaManuale', () => {
  const tx = {
    veicolo: { update: jest.fn() },
    dati_generici: { updateMany: jest.fn() },
    dati_specifici: { updateMany: jest.fn() },
  };
  const prisma = {
    veicolo: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new VeicoloService(
    prisma as unknown as PrismaService,
    {} as JwtService,
  );
  const dettaglio = {
    id: 4,
    targa: 'GS204RJ',
    id_utente: 7,
    dati_specifici: [],
    storico_intervento: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.veicolo.findUnique.mockResolvedValue(dettaglio);
  });

  it('la targa non si modifica (campo rifiutato dal DTO)', async () => {
    const dto = plainToInstance(UpdateVeicoloManualeDto, { targa: 'XX999XX' });
    const e = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(e.map((x) => x.property)).toContain('targa');
  });

  it('aggiorna solo i campi mandati e svuota quelli a null', async () => {
    const dto = plainToInstance(UpdateVeicoloManualeDto, {
      modello: 'Panda 1.2',
      potenza_kw: 44,
      nomeassicurazione: null,
      datascadenzabollo: '2027-01-31',
    });
    expect(await validate(dto)).toHaveLength(0);
    const v = await service.aggiornaManuale(4, dto, 7);
    expect(tx.veicolo.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { modello: 'Panda 1.2' },
    });
    expect(tx.dati_generici.updateMany).toHaveBeenCalledWith({
      where: { id_veicolo: 4 },
      data: expect.objectContaining({
        cavalli: 60,
        cilindrata: undefined,
      }) as unknown,
    });
    expect(tx.dati_specifici.updateMany).toHaveBeenCalledWith({
      where: { id_veicolo: 4 },
      data: expect.objectContaining({
        nomeassicurazione: null,
        datascadenzabollo: new Date('2027-01-31'),
        isbolloattivo: true,
        datascadenzarca: undefined,
      }) as unknown,
    });
    expect(v).toMatchObject({
      manuale: true,
      scadenze: expect.any(Object) as unknown,
    });
  });

  it('solo il proprietario può modificare', async () => {
    await expect(
      service.aggiornaManuale(4, new UpdateVeicoloManualeDto(), 8),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
