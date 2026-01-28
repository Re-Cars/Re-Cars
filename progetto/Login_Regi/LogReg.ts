import {input, password,} from "@inquirer/prompts";
class notlog_utente {
    registred:boolean;
    constructor(registred:boolean){
        this.registred = registred;
    }
    
}
class utente extends notlog_utente { 
        id:number;
        nick:string;
        pass:string;
        email:string;
        
        
        constructor (id:number,nick:string, pass:string, email:string, registred:boolean){
            super(registred);
            this.id = id;
            this.nick = nick;
            this.pass = pass;
            this.email = email;
        }
    async login(){
        console.log("===LOGIN===")
        
     let emailog:string = await input({message:"Inserisci l'email"}); 
    while(!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailog))){
        console.log("Email non valida")
        emailog= await input({message:"Inserire un email valida"})
    }
    let passlog:string = await password({mask:false, message:"Inserisci password"});
    while(!(/^(?=.*[A-Z])(?=.*[a-z]).{5,}$/.test(passlog))){
        console.log("password non valida")
        passlog = await password({message:"Inserisci una password che contiene: \n Almeno una lettera maiuscola \n Almeno una lettera minuscola \n deve essere di almeno 5 caratteri \n"})
    }
    let AccUtente = utenti.find(u => u.email === emailog) || null
    if(AccUtente && passlog === AccUtente.pass ){
        console.log("loggato");
    }else
        console.log("Email o password sbagliata")
}
    async registrazione(id:number){

    let nick:string = await input({message:"Inserisci il tuo nome"});
    let pass:string = await password({mask:false, message:"Inserisci password"});
    while(!(/^(?=.*[A-Z])(?=.*[a-z]).{5,}$/.test(pass))){
        console.log("password non valida")
        pass = await password({message:"Inserisci una password che contiene: \n Almeno una lettera maiuscola \n Almeno una lettera minuscola \n deve essere di almeno 5 caratteri \n"})
    }
    
    let email:string = await input({message:"Inserisci l'email"}); 
    while(!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))){
        console.log("Email non valida")
        email= await input({message:"Inserire un email valida"})
    }
    let EsIEmail = utenti.some(u => u.email === email)
    if(EsIEmail == true){
        console.log("Account esistente \n Verrai reindiRIZZato al login");
       await this.login();
    }
    else 
        console.log("Account creato \n");
    let user = new utente(id,nick,pass,email,true)
    utenti.push(user)
}


}

let utenti: utente[] = [
    new utente(0 , "Rick", "Ricktwo","rick@rick.it",true)
];
async function test() {
    let nuovoUtente = new utente(0, "", "", "", false);
    await nuovoUtente.registrazione(utenti.length);
   // console.log("Utenti registrati:", utenti);
}
test()
