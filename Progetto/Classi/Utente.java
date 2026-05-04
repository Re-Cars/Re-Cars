import java.util.UUID;
import java.util.ArrayList;


public class Utente {

String idUtente;
String username;
String passwordHash;
String email;
String cellulare;
ArrayList<Veicolo> veicoli;


//*costruttore classe

    public Utente (String username, String passwordHash, String email, String cellulare) {
        this.idUtente = UUID.randomUUID().toString();
        this.username = username;

        if (passwordHash.length() > 15) {
            throw new Error("la password non può superare i 15 caratteri");
        }
        this.passwordHash = passwordHash;
        this.email = email;

        if (!cellulare.matches("\\d+")) {
            throw new Error("il cellulare deve contenere solo numeri!");
        }

        if (cellulare.length() > 10) {
            throw new Error("il cellulare non può superare i 10 caratteri");
        }
        this.cellulare = cellulare;
        this.veicoli = new ArrayList<>();
    }


//*getter e setter

public String getIdUtente() {
    return idUtente;
}

public void setIdUtente(String idUtente) {
    this.idUtente = idUtente;
}

public String getUsername() {
    return username;
}

public void setUsername(String username) {
    this.username = username;
}

public String getPasswordHash() {
    return passwordHash;
}

public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
}

public String getEmail() {
    return email;
}

public void setEmail(String email) {
    this.email = email;
}

public String getCellulare() {
    return cellulare;
}

public void setCellulare(String cellulare) {
    this.cellulare = cellulare;
}

public ArrayList<Veicolo> getVeicoli() {
    return veicoli;
}


//*metodi della classe

    public boolean login(String password) {
        if (password == this.passwordHash) {
            return true;
        } else {
            return false;
        }
    }
    
    public void updateUsername(String newUsername) {
        this.username = newUsername;
    }

    public void updatePassword(String newPassword) {
        if (newPassword.length() > 15) {
            throw new Error("la password non può superare i 15 caratteri");
        }
        this.passwordHash = newPassword;
    }

    public void updateEmail(String newEmail) {
        this.email = newEmail;
    }

    public void updateCellulare(String newCellulare) {
        if (newCellulare.length() > 10) {
            throw new Error("il cellulare non può superare i 10 caratteri");
        }
        this.cellulare = newCellulare;
    }

    public void addVeicolo(Veicolo veicolo) {
        veicoli.add(veicolo);
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("[id utente: %-40s | username: %-40s | password: %-40s | email: %-40s | cellulare: %-40s]", idUtente, username, passwordHash, email, cellulare));
        if (veicoli.isEmpty()) {
            sb.append("nessun veicolo registrato\n");
        } else {
            sb.append("veicoli: \n");
        }
        for (Veicolo veicolo : veicoli) {
            sb.append(veicolo.toString()).append("\n");
        }
        return sb.toString();
    }
}