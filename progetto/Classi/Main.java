import java.util.Scanner;
import java.util.ArrayList;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;




public class Main {

    public static LocalDate leggiData(Scanner sc) {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                while (true) {
                    try {
                        System.out.print(": ");
                        return LocalDate.parse(sc.nextLine(), fmt);
                    } catch (Exception e) {
                        System.out.print("formato non valido usa (dd/MM/yyyy)");
                    }
                }
            }


    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ArrayList<Utente> utenti = new ArrayList<>();



//*inserimento utenti

        while(true) {

            System.out.print("inserisci username: ");
            String username = sc.nextLine();

            System.out.print("inserisci password: ");
            String passwordHash = sc.nextLine();

            System.out.print("inserisci email: ");
            String email = sc.nextLine();

            System.out.print("inserisci cellulare: ");
            String cellulare = sc.nextLine();
            System.out.println();


            Utente u1 = new Utente(username, passwordHash, email, cellulare);
            utenti.add(u1);
            System.out.println("utente creato con id --" + u1.getIdUtente() + "--");


//*inserimento veicoli

        String risposta;

        do {
            System.out.print("aggiungere veicolo a questo utente? s/n: ");
            risposta = sc.nextLine();


            if (!risposta.equals("s") && !risposta.equals("n")) {
                    System.out.println("scrivi bene coglione! - solo s/n(anche maiuscolo)");
                } 
                
            } while (!risposta.equals("s") && !risposta.equals("n"));

            if (risposta.equals("n")) {
                break;
            }


            System.out.print("inserisci targa: ");
            String targa = sc.nextLine();

            System.out.print("inserisci marca: ");
            String marca = sc.nextLine();

            System.out.print("inserisci modello: ");
            String modello = sc.nextLine();

            System.out.print("inserisci alimentazione: ");
            String alimentazione = sc.nextLine();

            System.out.print("inserisci cambio: ");
            String cambio = sc.nextLine();

            System.out.print("inserisci data revisione (dd/MM/yyyy)");
            LocalDate dataRevisione = leggiData(sc);

            System.out.print("inserisci data rca (dd/MM/yyyy)");
            LocalDate dataRca = leggiData(sc);

            System.out.print("inserisci km percorsi: ");
            double kmPercorsi = sc.nextDouble();
            sc.nextLine();
            System.out.println();



            Veicolo v1 = new Veicolo(targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi);
            u1.addVeicolo(v1);
            System.out.println("veicolo aggiunto con successo all'utente " + u1.getUsername() + "!");
            System.out.println();

            

            

            do {
                System.out.print("aggiungere un altro utente? s/n: ");
                risposta = sc.nextLine();
            
            
                if (!risposta.equals("s") && !risposta.equals("n")) {
                    System.out.println("scrivi bene coglione! - solo s/n(anche maiuscolo)");
                } 
                
            } while (!risposta.equals("s") && !risposta.equals("n"));

            if (risposta.equals("n")) {
                break;
            }
        }


//*stampa output

        System.out.println();
        System.out.println();
        System.out.println("---LISTA UTENTI---");
        System.out.println();

        for (Utente u : utenti) {
            System.out.println(u.toString());

            if(u.getVeicoli().isEmpty()) {
                System.out.println("nessun veicolo registrato");
            } else {
                System.out.println("---LISTA VEICOLI---");

                for (Veicolo v : u.getVeicoli()) {
                    System.out.println("  - " + v);
                }
            }
        } 
    }
}
