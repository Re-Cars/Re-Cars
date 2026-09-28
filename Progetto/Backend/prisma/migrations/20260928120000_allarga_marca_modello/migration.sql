-- Inserimento manuale dei veicoli: marca e modello come sul libretto
-- (D.1 / D.3), es. "Mercedes-Benz" non stava in 10 caratteri.
-- Da CHAR(12) a VARCHAR il cast toglie gli spazi di riempimento finali.
ALTER TABLE "veicolo" ALTER COLUMN "marca" TYPE VARCHAR(30);
ALTER TABLE "veicolo" ALTER COLUMN "modello" TYPE VARCHAR(40);
