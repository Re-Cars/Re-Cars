import { v4 as uuidv4 } from 'uuid';
import { Veicolo } from "./Veicolo";



export class Utente {
    id_utente: string;
    username: string;
    passwordHash: string;
    email: string;
    cellulare: string;
    veicoli: Veicolo[];


//costruttore classe

    constructor(username: string, passwordHash: string, email: string, cellulare: string) {
        this.id_utente = uuidv4();
        this.username = username;

        if (passwordHash.length > 15) {
            throw new Error("la password non può superare i 15 caratteri");
        }
        this.passwordHash = passwordHash;
        this.email = email;

        if (cellulare.length > 10) {
            throw new Error("il cellulare non può superare i 10 caratteri");
        }
        this.cellulare = cellulare;
        this.veicoli = [];
    }

//metodi classe

    login(password: string): boolean {
        if (password === this.passwordHash) {
            return true;
        } else {
            return false;
        }
    }
    
    updateUsername(newUsername: string): void {
        this.username = newUsername;
    }

    updatePassword(newPassword: string): void {
        if (newPassword.length > 15) {
            throw new Error("la password non può superare i 15 caratteri");
        }
        this.passwordHash = newPassword;
    }

    updateEmail(newEmail: string): void {
        this.email = newEmail;
    }

    updateCellulare(newCellulare: string): void {
        if (newCellulare.length > 10) {
            throw new Error("il cellulare non può superare i 10 caratteri");
        }
        this.cellulare = newCellulare;
    }

    addVeicolo(veicolo: Veicolo): void {
        this.veicoli.push(veicolo);
    }

    stampaInfoUtente(): void {
        console.log(`id_utente: ${this.id_utente} | username: ${this.username} | password: ${this.passwordHash} | email: ${this.email} | cellulare: ${this.cellulare}`);
        if (this.veicoli.length === 0) {
            console.log("nessun veicolo registrato");
        } else {
            console.log("veicoli:")
        }
        for (let veicolo of this.veicoli) {
            console.log(veicolo);
        }
    }
}