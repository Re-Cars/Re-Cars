import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateVeicoloDto } from './dto/create-veicolo.dto';
import * as datiMock from '../../data/veicoli.json';

@Injectable()
export class VeicoloService {
    constructor(private prisma: PrismaService) {}

    async cercaESalva(dto: CreateVeicoloDto) {
        const veicoli = (datiMock as any).data;
        const trovato = veicoli.find(
            (v: any) => v.LicensePlate.toUpperCase() === dto.targa.toUpperCase()
        );

    if (!trovato) {
        throw new NotFoundException(`Veicolo con targa ${dto.targa} non trovato`);
    }

    const veicolo = await this.prisma.veicolo.create({
        data: {
            targa: trovato.LicensePlate,
            marca: trovato.CarMake.substring(0, 10),
            modello: trovato.CarModel.substring(0, 12),
            id_utente: dto.id_utente,
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
}