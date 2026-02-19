import java.util.UUID;
import java.time.LocalDate;



public class Moto extends Veicolo {
    String idMoto;
    String numRuote;
    


//*costruttore classe

    public Moto(String targa, String marca, String modello, String alimentazione, String cambio, LocalDate dataRevisione, LocalDate dataRca, double kmPercorsi, String idMoto, String numRuote) {
        super(targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi);
        this.idMoto = UUID.randomUUID().toString();
        this.numRuote = numRuote;
    }


//*metodi della classe

    public boolean alertManutenzione() {
        double intervalloManutenzione = 10000;
        if (this.kmPercorsi >= intervalloManutenzione) {
            System.out.println("manutenzione necessaria!");
            return true;
        } else {
            System.out.println("tutto ok, manutenzione non necessaria!");
            return false;
        }
    }
}