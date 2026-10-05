import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LIMITE_VEICOLI, pianoUtente, richiediPremium } from '../piano';
import { CreateVeicoloDto } from './dto/create-veicolo.dto';
import {
  CreateVeicoloManualeDto,
  UpdateVeicoloManualeDto,
} from './dto/create-veicolo-manuale.dto';
import * as datiMock from '../../data/veicoli.json';
import { JwtService } from '@nestjs/jwt';
import { tipo_veicolo } from '@prisma/client';
import { oggiInItalia } from '../notifiche/promemoria';
import { calcolaScadenze, INTERVENTI_SCADENZA, scadenzeJson } from './scadenze';

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

/** Targhe del dataset di prova: gli altri veicoli sono inseriti a mano. */
const TARGHE_DATASET = new Set(
  (datiMock as unknown as VeicoliMockData).data.map((v) =>
    v.LicensePlate.toUpperCase(),
  ),
);

/** Interventi dello storico che spostano bollo, RCA, revisione e tagliando. */
const STORICO_SCADENZE = {
  where: { tipo: { in: Object.keys(INTERVENTI_SCADENZA) } },
  select: { tipo: true, data: true },
} as const;

const DETTAGLIO_VEICOLO = {
  dati_generici: true,
  dati_specifici: true,
  storico_intervento: STORICO_SCADENZE,
} as const;

type VeicoloLetto = {
  targa: string | null;
  dati_specifici: {
    dataimmatricolazione: Date | null;
    datascadenzabollo: Date | null;
    datascadenzarca: Date | null;
  }[];
  storico_intervento: { tipo: string; data: Date }[];
};

/**
 * Veicolo per il frontend: scadenze già calcolate (date salvate +
 * storico) e `manuale` (true = inserito a mano, quindi modificabile).
 */
function conScadenze<T extends VeicoloLetto>(v: T) {
  const { storico_intervento, ...resto } = v;
  return {
    ...resto,
    manuale: !TARGHE_DATASET.has((v.targa ?? '').toUpperCase()),
    scadenze: scadenzeJson(
      calcolaScadenze(v.dati_specifici[0], storico_intervento, oggiInItalia()),
    ),
  };
}

@Injectable()
export class VeicoloService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async cercaSoloDati(targa: string, userId: number) {
    await richiediPremium(
      this.prisma,
      userId,
      'La ricerca del veicolo dalla targa',
    );
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
    await richiediPremium(
      this.prisma,
      userId,
      "L'aggiunta del veicolo dalla targa",
    );
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
    // revisione e tagliando indicati nel modulo diventano i primi interventi
    // dello storico: da lì in poi le scadenze si aggiornano con lo storico
    const primiInterventi = [
      dto.ultimarevisione && {
        data: new Date(dto.ultimarevisione),
        categoria: 'gestione' as const,
        tipo: 'Revisione',
      },
      dto.ultimotagliando && {
        data: new Date(dto.ultimotagliando),
        categoria: 'ordinario' as const,
        tipo: 'Tagliando',
      },
    ].filter((i) => !!i);

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
      if (primiInterventi.length) {
        await tx.storico_intervento.createMany({
          data: primiInterventi.map((i) => ({
            ...i,
            id_veicolo: veicolo.id,
            descrizione: 'Inserito con il veicolo',
          })),
        });
      }
      return veicolo;
    });
  }

  /**
   * Modifica dei dati di un veicolo inserito a mano (non la targa). I
   * veicoli aggiunti dalla targa prendono i dati dal servizio e non si
   * modificano. Campi assenti = invariati, null = svuotati.
   */
  async aggiornaManuale(
    id: number,
    dto: UpdateVeicoloManualeDto,
    userId: number,
  ) {
    const veicolo = await this.prisma.veicolo.findUnique({ where: { id } });
    if (!veicolo)
      throw new NotFoundException(`Veicolo con id ${id} non trovato`);
    if (veicolo.id_utente !== userId) {
      throw new ForbiddenException('Non puoi modificare un veicolo non tuo');
    }
    if (TARGHE_DATASET.has((veicolo.targa ?? '').toUpperCase())) {
      throw new ForbiddenException(
        'Questo veicolo è stato aggiunto dalla targa: i suoi dati arrivano dal servizio e non si modificano a mano.',
      );
    }

    // undefined = non toccare, null = svuota
    const campo = <V, R>(v: V | null | undefined, conv: (x: V) => R) =>
      v === undefined ? undefined : v === null ? null : conv(v);
    const data = (iso: string) => new Date(iso);

    await this.prisma.$transaction(async (tx) => {
      await tx.veicolo.update({
        where: { id },
        data: {
          ...(dto.marca && { marca: dto.marca }),
          ...(dto.modello && { modello: dto.modello }),
        },
      });
      await tx.dati_generici.updateMany({
        where: { id_veicolo: id },
        data: {
          ...(dto.tipo_veicolo && { tipo_veicolo: dto.tipo_veicolo }),
          cavalli: campo(dto.potenza_kw, (kw) => Math.round(kw * 1.35962)),
          numporte: campo(dto.numporte, String),
          alimentazione: campo(dto.alimentazione, (a) => a),
          cilindrata: campo(dto.cilindrata, String),
        },
      });
      await tx.dati_specifici.updateMany({
        where: { id_veicolo: id },
        data: {
          ...(dto.dataimmatricolazione && {
            dataimmatricolazione: data(dto.dataimmatricolazione),
          }),
          nomeassicurazione: campo(dto.nomeassicurazione, (n) => n || null),
          datascadenzarca: campo(dto.datascadenzarca, data),
          isinsured: campo(dto.datascadenzarca, () => true),
          datascadenzabollo: campo(dto.datascadenzabollo, data),
          isbolloattivo: campo(dto.datascadenzabollo, () => true),
        },
      });
    });

    return this.getVeicoloById(id, userId);
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
    const [count, piano] = await Promise.all([
      this.prisma.veicolo.count({ where: { id_utente: userId } }),
      pianoUtente(this.prisma, userId),
    ]);
    if (count >= LIMITE_VEICOLI[piano]) {
      throw new ForbiddenException(
        `Il piano Gratis comprende ${LIMITE_VEICOLI.base} veicolo: con Premium puoi aggiungerne quanti vuoi.`,
      );
    }
  }

  async getVeicoliByUtente(id_utente: number) {
    const veicoli = await this.prisma.veicolo.findMany({
      where: { id_utente },
      include: DETTAGLIO_VEICOLO,
    });
    return veicoli.map(conScadenze);
  }

  async getVeicoloById(id: number, userId?: number, userType?: string) {
    const veicolo = await this.prisma.veicolo.findUnique({
      where: { id },
      include: DETTAGLIO_VEICOLO,
    });
    if (!veicolo)
      throw new NotFoundException(`Veicolo con id ${id} non trovato`);

    if (userId && userType !== 'officina' && veicolo.id_utente !== userId) {
      throw new ForbiddenException(
        'Non autorizzato ad accedere a questo veicolo',
      );
    }

    return conScadenze(veicolo);
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
