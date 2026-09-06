ALTER TABLE "storico_intervento" RENAME COLUMN "nome" TO "tipo";

ALTER TABLE "storico_intervento" ADD COLUMN "sigla_citta" CHAR(2);

ALTER TABLE "storico_intervento" ADD CONSTRAINT "fk_citta_storico"
  FOREIGN KEY ("sigla_citta") REFERENCES "citta"("sigla")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "idx_storico_sigla_citta" ON "storico_intervento"("sigla_citta");