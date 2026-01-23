import inquirer from 'inquirer';
import { Utente } from "./Utente";
import { Veicolo } from "./Veicolo";



async function creaUtente(): Promise<Utente> {
    let input = await inquirer.prompt([
        {
            type: 'input',
            name: 'username',
            message: 'inserisci username:',
        },
        {
            type: 'password',
            name: 'passwordHash',
            message: 'inserisci password (max 15 caratteri):',
            validate: function(input: string) {
                if (input.length > 15) {
                    return "La password non può superare i 15 caratteri!";
                }
                return true;
            }
        },
        {
            type: 'input',
            name: 'email',
            message: 'inserisci email:'
        },
        {
            type: 'input',
            name: 'cellulare',
            message: 'inserisci cellulare (max 15 caratteri):',
            validate: function(input: string) {
                if (input.length > 10) {
                    return "Il cellulare non può superare i 10 caratteri!";
                }
                if (isNaN(Number(input))) {
                    return "inserisci solo numeri, cazzone!"
                }
                return true;
                }
        },
    ]);

    let nuovoUtente = new Utente(
        input.username,
        input.passwordHash,
        input.email,
        input.cellulare
    );
    console.log("Utente creato con successo:");

    return nuovoUtente;

}

async function main() {
    let nuovoUtente = await creaUtente();
    let auto = new Veicolo("RG236RJ", "FORD", "FOCUS N-LINE", "BENZINA", "MANUALE", new Date("2025-12-19"), new Date("2024-06-21"), 12000);
    nuovoUtente.addVeicolo(auto);
    nuovoUtente.stampaInfoUtente();
    nuovoUtente.updatePassword("bossetti");
    nuovoUtente.stampaInfoUtente();
}

main();