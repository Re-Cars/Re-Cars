import java.util.UUID;
import java.time.LocalDate;



public class Scooter extends Veicolo {
    String idScooter;
    String numRuote;
    


//*costruttore classe

    public Scooter(String targa, String marca, String modello, String alimentazione, String cambio, LocalDate dataRevisione, LocalDate dataRca, double kmPercorsi, String idScooter, String numRuote) {
        super(targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi);
        this.idScooter = UUID.randomUUID().toString();
        this.numRuote = numRuote;
    }


//*getter e setter

    public String getIdScooter() {
        return idScooter;
    }

    public void setIdScooter(String idScooter) {
        this.idScooter = idScooter;
    }

    public String getNumRuote() {
        return numRuote;
    }

    public void setNumRuote(String numRuote) {
        this.numRuote = numRuote;
    }


//*metodi della classe

    public boolean alertManutenzione() {
        double intervalloManutenzione = 5000;
        if (this.kmPercorsi >= intervalloManutenzione) {
            System.out.println("manutenzione necessaria!");
            return true;
        } else {
            System.out.println("tutto ok, manutenzione non necessaria!");
            return false;
        }
    }
}