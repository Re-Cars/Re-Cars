import { ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateVeicoloManualeDto } from './dto/create-veicolo-manuale.dto';
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
