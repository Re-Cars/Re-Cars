import java.util.UUID;
import java.time.LocalDate;



public class Auto extends Veicolo {
    String idAuto;
    String numPorte;
    


//*costruttore classe

    public Auto (String targa, String marca, String modello, String alimentazione, String cambio, LocalDate dataRevisione, LocalDate dataRca, double kmPercorsi, String id_auto, String numPorte) {
        super(targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi);
        this.idAuto = UUID.randomUUID().toString();
        this.numPorte = numPorte;
    }


//*getter e setter

    public String getIdAuto() {
        return idAuto;
    }

    public void setIdAuto(String idAuto) {
        this.idAuto = idAuto;
    }

    public String getNumPorte() {
        return numPorte;
    }

    public void setNumPorte(String numPorte) {
        this.numPorte = numPorte;
    }


//*metodi classe

    public boolean alertManutenzione() {
        double intervalloManutenzione = 20000;
        if (this.kmPercorsi >= intervalloManutenzione) {
            System.out.println("manutenzione necessaria!");
            return true;
        } else {
            System.out.println("tutto ok, manutenzione non necessaria!");
            return false;
        }
    }
}