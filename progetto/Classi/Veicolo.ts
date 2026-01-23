import { v4 as uuidv4 } from 'uuid';


export class Veicolo {
    private _id_veicolo: string;
    private _targa: string;
    marca: string;
    modello: string;
    alimentazione: string;
    cambio: string;
    dataRevisione: Date;
    dataRca: Date;
    kmPercorsi: number;


//costruttore classe

    constructor(_targa: string, marca: string, modello: string, alimentazione: string, cambio: string, dataRevisione: Date, dataRca: Date, kmPercorsi: number) {
        this._id_veicolo = uuidv4();
        this._targa = _targa;
        this.marca = marca;
        this.modello = modello;
        this.alimentazione = alimentazione;
        this.cambio = cambio;
        this.dataRevisione = dataRevisione;
        this.dataRca = dataRca;
        this.kmPercorsi = kmPercorsi;
    }

    get id_veicolo(): string {
        return this._id_veicolo;
    }

    set id_veicolo(id_veicolo: string) {
        this._id_veicolo = id_veicolo;
    }

    get targa(): string {
        return this._targa;
    }

    set targa(targa: string) {
        this._targa = targa;
    }

//metodi classe

    updateTarga(newTarga: string): void {
        this._targa = newTarga;
    }

    updateMarca(newMarca: string): void {
        this.marca = newMarca;
    }

    updateModello(newModello: string): void {
        this.modello = newModello;
    }

    updateAlimentazione(newAlimentazione: string): void {
        this.alimentazione = newAlimentazione;
    }

    updateCambio(newCambio: string): void {
        this.cambio = newCambio;
    }

    calcolaConsumoMedio(kmPercorsi: number, litriConsumati: number): number {
        return (litriConsumati / kmPercorsi) * 100;
    }

    isRevisioneScaduta(): boolean {
    let oggi = new Date();
    return this.dataRevisione < oggi;
    }

    isRcaScaduta(): boolean {
    let oggi = new Date();
    return this.dataRca < oggi;
    }

    descrizioneCompleta(): void {
    console.log(`${this.marca} ${this.modello} ${this._targa} ${this.kmPercorsi} - ${this.alimentazione}, cambio: ${this.cambio}, data revisione: ${this.dataRevisione}, data rca: ${this.dataRca}`);
    }
}