import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateVeicoloDto } from './dto/create-veicolo.dto';
import * as datiMock from '../../data/veicoli.json';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class VeicoloService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async cercaSoloDati(targa: string) {
    const veicoli = (datiMock as any).data;
    const trovato = veicoli.find(
      (v: any) => v.LicensePlate.toUpperCase() === targa.toUpperCase(),
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
    const veicoli = (datiMock as any).data;
    const trovato = veicoli.find(
      (v: any) => v.LicensePlate.toUpperCase() === dto.targa.toUpperCase(),
    );

    if (!trovato) {
      throw new NotFoundException(`Veicolo con targa ${dto.targa} non trovato`);
    }

    const esistente = await this.prisma.veicolo.findFirst({
      where: { targa: dto.targa.toUpperCase() },
    });

    if (esistente) {
      throw new ConflictException(
        `Hai già aggiunto il veicolo con targa ${dto.targa}`,
      );
    }

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

    const veicolo = await this.prisma.veicolo.create({
      data: {
        targa: trovato.LicensePlate,
        marca: trovato.CarMake.substring(0, 10),
        modello: trovato.CarModel.substring(0, 12),
        id_utente: userId,
      },
    });

    await this.prisma.dati_generici.create({
      data: {
        tipo_veicolo: trovato.TipoVeicolo,
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
      throw new ForbiddenException('Non autorizzato ad accedere a questo veicolo');
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

    await this.prisma.storico_intervento.deleteMany({ where: { id_veicolo: id } });
    await this.prisma.dati_generici.deleteMany({ where: { id_veicolo: id } });
    await this.prisma.dati_specifici.deleteMany({ where: { id_veicolo: id } });
    await this.prisma.veicolo.delete({ where: { id } });

    return { message: `Veicolo ${id} eliminato correttamente` };
  }
}
