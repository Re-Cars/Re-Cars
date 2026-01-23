import { Veicolo } from "./Veicolo";
import { v4 as uuidv4 } from 'uuid';



class Scooter extends Veicolo {
    id_scooter: string;
    numRuote: string;
    


//costruttore classe

    constructor(_targa: string, marca: string, modello: string, alimentazione: string, cambio: string, dataRevisione: Date, dataRca: Date, kmPercorsi: number, id_scooter: string, numRuote: string) {
        super(_targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi);
        this.id_scooter = uuidv4();
        this.numRuote = numRuote;
    }

//metodi classe

    alertManutenzione(): boolean {
        let intervalloManutenzione = 5000;
        if (this.kmPercorsi >= intervalloManutenzione) {
            console.log("manutenzione necessaria!");
            return true;
        } else {
            console.log("tutto ok, manutenzione non necessaria!")
            return false;
        }
    }
}