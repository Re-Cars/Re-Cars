import java.util.UUID;
import java.time.LocalDate;


public class Veicolo {

String idVeicolo;
String targa;
String marca;
String modello;
String alimentazione;
String cambio;
LocalDate dataRevisione;
LocalDate dataRca;
double kmPercorsi;


//*costruttore classe

    public Veicolo(String targa, String marca, String modello, String alimentazione, String cambio, LocalDate dataRevisione, LocalDate dataRca, double kmPercorsi) {
        this.idVeicolo = UUID.randomUUID().toString();
        this.targa = targa;
        this.marca = marca;
        this.modello = modello;
        this.alimentazione = alimentazione;
        this.cambio = cambio;
        this.dataRevisione = dataRevisione;
        this.dataRca = dataRca;
        this.kmPercorsi = kmPercorsi;
    }


//*getter e setter

    public String getId_Veicolo() {
        return idVeicolo;
    }

    public void setId_Veicolo(String idVeicolo) {
        this.idVeicolo = idVeicolo;
    }

    public String getTarga() {
        return targa;
    }

    public void setTarga(String targa) {
        this.targa = targa;
    }

    public String getMarca() {
        return marca;
    }

    public void setMarca(String marca) {
        this.marca = marca;
    }

    public String getModello() {
        return modello;
    }

    public void setModello(String modello) {
        this.modello = modello;
    }

    public String getAlimentazione() {
        return alimentazione;
    }

    public void setAlimentazione(String alimentazione) {
        this.alimentazione = alimentazione;
    }

    public String getCambio() {
        return cambio;
    }

    public void setCambio(String cambio) {
        this.cambio = cambio;
    }

    public LocalDate getDataRevisione() {
        return dataRevisione;
    }

    public void setDataRevisione(LocalDate dataRevisione) {
        this.dataRevisione = dataRevisione;
    }

    public LocalDate getDataRca() {
        return dataRca;
    }

    public void setDataRca(LocalDate dataRca) {
        this.dataRca = dataRca;
    }

    public double getKmPercorsi() {
        return kmPercorsi;
    }

    public void setKmPercorsi(double kmPercorsi) {
        this.kmPercorsi = kmPercorsi;
    }


//*metodi della classe

    public void updateTarga(String newTarga) {
        this.targa = newTarga;
    }

    public void updateMarca(String newMarca) {
        this.marca = newMarca;
    }

    public void updateModello(String newModello) {
        this.modello = newModello;
    }

    public void updateAlimentazione(String newAlimentazione) {
        this.alimentazione = newAlimentazione;
    }

    public void updateCambio(String newCambio) {
        this.cambio = newCambio;
    }

    public double calcolaConsumoMedio(double kmPercorsi, double litriConsumati) {
        return (litriConsumati / kmPercorsi) * 100;
    }

    public boolean isRevisioneScaduta() {
    LocalDate oggi = LocalDate.now();

        if (this.dataRevisione.isBefore(oggi)) {
            System.out.println("devi fare la revisione");
            return true;
        } else {
            System.out.println("sei a posto con la revisione!");
            return false;
        }
    }

    public boolean isRcaScaduta() {
    LocalDate oggi = LocalDate.now();

        if (this.dataRca.isBefore(oggi)) {
            System.out.println("devi pagare la rata dell'assicurazione");
            return true;
        } else {
            System.out.println("sei a posto con l'assicurazione!");
            return false;
        }
    }

    @Override
    public String toString(){
        String dataRevisioneForm = String.format("%td/%tm/%tY", dataRevisione, dataRevisione, dataRevisione);
        String dataRcaForm = String.format("%td/%tm/%tY", dataRca, dataRca, dataRca);
        return String.format("[marca: %-40s | modello: %-40s | targa: %-40s | km percorsi: %-40d | alimentazione: %-40s | cambio: %-40s | data revisione: %-40s | data rca: %-40s]", marca, modello, targa, kmPercorsi, alimentazione, cambio, dataRevisioneForm, dataRcaForm);
    }
}