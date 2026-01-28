import { Veicolo } from "./Veicolo";
import { v4 as uuidv4 } from 'uuid'; 



class Auto extends Veicolo {
    id_auto: string;
    numPorte: string;
    


//costruttore classe

    constructor(_targa: string, marca: string, modello: string, alimentazione: string, cambio: string, dataRevisione: Date, dataRca: Date, kmPercorsi: number, id_auto: string, numPorte: string) {
        super(_targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi);
        this.id_auto = uuidv4();
        this.numPorte = numPorte;
    }

//metodi classe

    alertManutenzione(): boolean {
        let intervalloManutenzione = 20000;
        if (this.kmPercorsi >= intervalloManutenzione) {
            console.log("manutenzione necessaria!");
            return true;
        } else {
            console.log("tutto ok, manutenzione non necessaria!")
            return false;
        }
    }
}