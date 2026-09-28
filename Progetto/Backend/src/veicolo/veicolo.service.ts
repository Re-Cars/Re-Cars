import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateVeicoloDto } from './dto/create-veicolo.dto';
import { CreateVeicoloManualeDto } from './dto/create-veicolo-manuale.dto';
import * as datiMock from '../../data/veicoli.json';
import { JwtService } from '@nestjs/jwt';
import { tipo_veicolo } from '@prisma/client';

interface VeicoloMock {
  LicensePlate: string;
  TipoVeicolo: string;
  Description: string;
  RegistrationYear: string;
  CarMake: string;
  CarModel: string;
  EngineSize: string;
  FuelType: string;
  MakeDescription: string;
  ModelDescription: string;
  Immobiliser: string;
  NumberOfDoors: string;
  Version: string;
  ABS: string;
  AirBag: string;
  Vin: string;
  KType: string;
  PowerCV: number;
  PowerKW: number;
  PowerFiscal: number;
  RCA?: {
    Company?: string;
    Expiry?: string;
    ExpiryTimestamp?: number;
    IsInsured?: boolean;
  };
  Bollo?: {
    Expiry?: string;
    ExpiryTimestamp?: number;
    IsActive?: boolean;
  };
  Timestamp: number;
}

interface VeicoliMockData {
  data: VeicoloMock[];
  success: boolean;
  message: string;
  error: null;
}

@Injectable()
export class VeicoloService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  cercaSoloDati(targa: string) {
    const veicoli = (datiMock as unknown as VeicoliMockData).data;
    const trovato = veicoli.find(
      (v) => v.LicensePlate.toUpperCase() === targa.toUpperCase(),
    );
    if (!trovato) {
      throw new NotFoundException(`Veicolo con targa ${targa} non trovato`);
    }
    return {
      targa: trovato.LicensePlate,
      marca: trovato.CarMake,
      modello: trovato.CarModel,
      alimentazione: trovato.FuelType,
      cavalli: trovato.PowerCV,
      tipo_veicolo: trovato.TipoVeicolo,
      isbolloattivo: trovato.Bollo?.IsActive ?? null,
      isinsured: trovato.RCA?.IsInsured ?? null,
    };
  }

  async cercaESalva(dto: CreateVeicoloDto, userId: number) {
    const veicoli = (datiMock as unknown as VeicoliMockData).data;
    const trovato = veicoli.find(
      (v) => v.LicensePlate.toUpperCase() === dto.targa.toUpperCase(),
    );

    if (!trovato) {
      throw new NotFoundException(`Veicolo con targa ${dto.targa} non trovato`);
    }

    await this.verificaTargaLibera(dto.targa);
    await this.verificaLimitePiano(userId);

    const veicolo = await this.prisma.veicolo.create({
      data: {
        targa: trovato.LicensePlate,
        marca: trovato.CarMake.substring(0, 30),
        modello: trovato.CarModel.substring(0, 40),
        id_utente: userId,
      },
    });

    await this.prisma.dati_generici.create({
      data: {
        tipo_veicolo: trovato.TipoVeicolo as tipo_veicolo,
        cavalli: trovato.PowerCV,
        numporte: trovato.NumberOfDoors || null,
        alimentazione: trovato.FuelType,
        cilindrata: trovato.EngineSize || null,
        id_veicolo: veicolo.id,
      },
    });

    await this.prisma.dati_specifici.create({
      data: {
        dataimmatricolazione: trovato.RegistrationYear
          ? new Date(`${trovato.RegistrationYear}-01-01`)
          : null,
        nomeassicurazione: trovato.RCA?.Company || null,
        datascadenzarca: trovato.RCA?.Expiry
          ? new Date(trovato.RCA.Expiry)
          : null,
        isinsured: trovato.RCA?.IsInsured ?? null,
        datascadenzabollo: trovato.Bollo?.Expiry
          ? new Date(trovato.Bollo.Expiry)
          : null,
        isbolloattivo: trovato.Bollo?.IsActive ?? null,
        id_veicolo: veicolo.id,
      },
    });

    return veicolo;
  }

  /**
   * Veicolo inserito a mano dall'utente con i dati del libretto (niente
   * dataset di prova): stessi controlli di targa e piano di cercaESalva.
   */
  async salvaManuale(dto: CreateVeicoloManualeDto, userId: number) {
    await this.verificaTargaLibera(dto.targa);
    await this.verificaLimitePiano(userId);

    const data = (iso?: string) => (iso ? new Date(iso) : null);

    return this.prisma.$transaction(async (tx) => {
      const veicolo = await tx.veicolo.create({
        data: {
          targa: dto.targa,
          marca: dto.marca,
          modello: dto.modello,
          id_utente: userId,
        },
      });
      await tx.dati_generici.create({
        data: {
          tipo_veicolo: dto.tipo_veicolo,
          // sul libretto la potenza è in kW (P.2), nel database in CV
          cavalli: dto.potenza_kw ? Math.round(dto.potenza_kw * 1.35962) : null,
          numporte: dto.numporte ? String(dto.numporte) : null,
          alimentazione: dto.alimentazione ?? null,
          cilindrata: dto.cilindrata ? String(dto.cilindrata) : null,
          id_veicolo: veicolo.id,
        },
      });
      await tx.dati_specifici.create({
        data: {
          dataimmatricolazione: data(dto.dataimmatricolazione),
          nomeassicurazione: dto.nomeassicurazione || null,
          datascadenzarca: data(dto.datascadenzarca),
          // con una scadenza inserita la copertura si considera attiva: se la
          // data è passata la dashboard la mostra comunque come scaduta
          isinsured: dto.datascadenzarca ? true : null,
          datascadenzabollo: data(dto.datascadenzabollo),
          isbolloattivo: dto.datascadenzabollo ? true : null,
          id_veicolo: veicolo.id,
        },
      });
      return veicolo;
    });
  }

  private async verificaTargaLibera(targa: string) {
    const esistente = await this.prisma.veicolo.findFirst({
      where: { targa: targa.toUpperCase() },
    });
    if (esistente) {
      throw new ConflictException(
        `Hai già aggiunto il veicolo con targa ${targa}`,
      );
    }
  }

  private async verificaLimitePiano(userId: number) {
    const count = await this.prisma.veicolo.count({
      where: { id_utente: userId },
    });

    const abbonamento = await this.prisma.abbonamento.findFirst({
      where: { id_utente: userId, stato: 'attivo' },
      orderBy: { data_inizio: 'desc' },
    });

    const piano = abbonamento?.piano || 'base';

    const limiti: Record<string, number> = {
      base: 1,
      premium: 5,
      pro: Infinity,
    };

    const limite = limiti[piano] ?? 1;

    if (count >= limite) {
      throw new ForbiddenException(
        `Il piano ${piano} consente massimo ${limite === Infinity ? 'illimitati' : limite} veicoli. Passa a un piano superiore.`,
      );
    }
  }

  async getVeicoliByUtente(id_utente: number) {
    return this.prisma.veicolo.findMany({
      where: { id_utente },
      include: {
        dati_generici: true,
        dati_specifici: true,
      },
    });
  }

  async getVeicoloById(id: number, userId?: number, userType?: string) {
    const veicolo = await this.prisma.veicolo.findUnique({
      where: { id },
      include: {
        dati_generici: true,
        dati_specifici: true,
      },
    });
    if (!veicolo)
      throw new NotFoundException(`Veicolo con id ${id} non trovato`);

    if (userId && userType !== 'officina' && veicolo.id_utente !== userId) {
      throw new ForbiddenException(
        'Non autorizzato ad accedere a questo veicolo',
      );
    }

    return veicolo;
  }

  async eliminaVeicolo(id: number, userId: number) {
    const veicolo = await this.prisma.veicolo.findUnique({ where: { id } });
    if (!veicolo)
      throw new NotFoundException(`Veicolo con id ${id} non trovato`);

    if (veicolo.id_utente !== userId) {
      throw new ForbiddenException('Non puoi eliminare un veicolo non tuo');
    }

    await this.prisma.storico_intervento.deleteMany({
      where: { id_veicolo: id },
    });
    await this.prisma.dati_generici.deleteMany({ where: { id_veicolo: id } });
    await this.prisma.dati_specifici.deleteMany({ where: { id_veicolo: id } });
    await this.prisma.veicolo.delete({ where: { id } });

    return { message: `Veicolo ${id} eliminato correttamente` };
  }
}
