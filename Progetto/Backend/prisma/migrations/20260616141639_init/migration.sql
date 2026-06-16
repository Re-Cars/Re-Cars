-- CreateEnum
CREATE TYPE "tipo_utente" AS ENUM ('privato', 'azienda');

-- CreateEnum
CREATE TYPE "tipo_officina" AS ENUM ('meccanica', 'carrozzeria', 'gommista', 'elettrauto', 'multimarca', 'concessionaria', 'tagliando', 'revisione');

-- CreateEnum
CREATE TYPE "piano_abbonamento" AS ENUM ('base', 'premium', 'pro', 'azienda_business', 'azienda_business_pro', 'officina_business', 'officina_business_pro');

-- CreateEnum
CREATE TYPE "tipo_abbonamento" AS ENUM ('utente', 'azienda', 'officina');

-- CreateEnum
CREATE TYPE "stato_abbonamento" AS ENUM ('attivo', 'scaduto', 'annullato');

-- CreateEnum
CREATE TYPE "tipo_veicolo" AS ENUM ('Autovettura', 'Autocarro', 'Autobus', 'Camper', 'Moto', 'Scooter', 'Quad');

-- CreateEnum
CREATE TYPE "categoria_intervento" AS ENUM ('ordinario', 'straordinario', 'gestione', 'annotazioni');

-- CreateEnum
CREATE TYPE "stato_prenotazione" AS ENUM ('in_attesa', 'confermata', 'annullata', 'completata');

-- CreateTable
CREATE TABLE "utente" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(20) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "cellulare" VARCHAR(20),
    "avatar" TEXT,
    "tipo" "tipo_utente" NOT NULL DEFAULT 'privato',
    "stripe_customer_id" VARCHAR(255),
    "ragione_sociale" VARCHAR(100),
    "partita_iva" VARCHAR(11),
    "codice_sdi" VARCHAR(7),

    CONSTRAINT "utenti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abbonamento" (
    "id" SERIAL NOT NULL,
    "tipo" "tipo_abbonamento" NOT NULL,
    "piano" "piano_abbonamento" NOT NULL,
    "stato" "stato_abbonamento" NOT NULL DEFAULT 'attivo',
    "data_inizio" DATE NOT NULL,
    "data_fine" DATE,
    "stripe_subscription_id" VARCHAR(255),
    "id_utente" INTEGER,
    "id_officina" INTEGER,

    CONSTRAINT "abbonamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citta" (
    "sigla" CHAR(2) NOT NULL,
    "nome" VARCHAR(50) NOT NULL,

    CONSTRAINT "citta_pkey" PRIMARY KEY ("sigla")
);

-- CreateTable
CREATE TABLE "officina" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "ragione_sociale" VARCHAR(100) NOT NULL,
    "partita_iva" CHAR(11) NOT NULL,
    "codice_sdi" VARCHAR(7),
    "nome" VARCHAR(100) NOT NULL,
    "indirizzo" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "latitudine" DOUBLE PRECISION,
    "longitudine" DOUBLE PRECISION,
    "ponti_disponibili" INTEGER,
    "orari_apertura" JSONB,
    "tipi" "tipo_officina"[],
    "stripe_customer_id" VARCHAR(255),
    "sigla_citta" CHAR(2) NOT NULL,

    CONSTRAINT "officina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veicolo" (
    "id" SERIAL NOT NULL,
    "targa" CHAR(7),
    "marca" VARCHAR(10),
    "modello" CHAR(12),
    "id_utente" INTEGER NOT NULL,

    CONSTRAINT "veicoli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dati_generici" (
    "id" SERIAL NOT NULL,
    "tipo_veicolo" "tipo_veicolo" NOT NULL,
    "cavalli" INTEGER,
    "numporte" CHAR(1),
    "alimentazione" VARCHAR(20),
    "cilindrata" VARCHAR(5),
    "colore" VARCHAR(7),
    "id_veicolo" INTEGER NOT NULL,

    CONSTRAINT "dati_generici_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dati_specifici" (
    "id" SERIAL NOT NULL,
    "dataimmatricolazione" DATE,
    "nomeassicurazione" VARCHAR(50),
    "datascadenzarca" DATE,
    "isinsured" BOOLEAN,
    "datascadenzabollo" DATE,
    "isbolloattivo" BOOLEAN,
    "id_veicolo" INTEGER NOT NULL,

    CONSTRAINT "dati_specifici_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storico_intervento" (
    "id" SERIAL NOT NULL,
    "id_veicolo" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "categoria" "categoria_intervento" NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descrizione" VARCHAR(255),
    "mediante" VARCHAR(100),
    "costo" DECIMAL(10,2),

    CONSTRAINT "storico_intervento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prenotazione" (
    "id" SERIAL NOT NULL,
    "dataprenotazione" TIMESTAMP(6) NOT NULL,
    "descrizione" VARCHAR(250),
    "stato" "stato_prenotazione" NOT NULL DEFAULT 'in_attesa',
    "id_utente" INTEGER NOT NULL,
    "id_officina" INTEGER NOT NULL,

    CONSTRAINT "prenotazioni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recensione" (
    "id" SERIAL NOT NULL,
    "voto" INTEGER NOT NULL,
    "messaggio" VARCHAR(255) NOT NULL,
    "data" TIMESTAMP(6) NOT NULL,
    "id_prenotazione" INTEGER NOT NULL,

    CONSTRAINT "recensione_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utenti_username_key" ON "utente"("username");

-- CreateIndex
CREATE UNIQUE INDEX "utenti_email_key" ON "utente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utenti_cellulare_key" ON "utente"("cellulare");

-- CreateIndex
CREATE UNIQUE INDEX "utente_stripe_customer_id_key" ON "utente"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "utente_partita_iva_key" ON "utente"("partita_iva");

-- CreateIndex
CREATE INDEX "idx_utente_id_email" ON "utente"("id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "abbonamento_stripe_subscription_id_key" ON "abbonamento"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "idx_abbonamento_utente" ON "abbonamento"("id_utente");

-- CreateIndex
CREATE INDEX "idx_abbonamento_officina" ON "abbonamento"("id_officina");

-- CreateIndex
CREATE UNIQUE INDEX "citta_nome_key" ON "citta"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "officina_email_key" ON "officina"("email");

-- CreateIndex
CREATE UNIQUE INDEX "officina_partita_iva_key" ON "officina"("partita_iva");

-- CreateIndex
CREATE UNIQUE INDEX "officina_stripe_customer_id_key" ON "officina"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "idx_officina_id_email" ON "officina"("id", "email");

-- CreateIndex
CREATE INDEX "idx_veicolo_id_targa" ON "veicolo"("id", "targa");

-- CreateIndex
CREATE INDEX "idx_dati_generici_id" ON "dati_generici"("id");

-- CreateIndex
CREATE INDEX "idx_dati_specifici_id" ON "dati_specifici"("id");

-- CreateIndex
CREATE INDEX "idx_storico_id_veicolo" ON "storico_intervento"("id", "id_veicolo");

-- CreateIndex
CREATE INDEX "idx_prenotazione_id_dataprenotazione" ON "prenotazione"("id", "dataprenotazione");

-- CreateIndex
CREATE UNIQUE INDEX "recensione_id_prenotazione_key" ON "recensione"("id_prenotazione");

-- AddForeignKey
ALTER TABLE "abbonamento" ADD CONSTRAINT "abbonamento_id_utente_fkey" FOREIGN KEY ("id_utente") REFERENCES "utente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "abbonamento" ADD CONSTRAINT "abbonamento_id_officina_fkey" FOREIGN KEY ("id_officina") REFERENCES "officina"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "officina" ADD CONSTRAINT "fk_citta_officina" FOREIGN KEY ("sigla_citta") REFERENCES "citta"("sigla") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "veicolo" ADD CONSTRAINT "veicoli_id_utente_fkey" FOREIGN KEY ("id_utente") REFERENCES "utente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dati_generici" ADD CONSTRAINT "fk_dati_generici_veicolo" FOREIGN KEY ("id_veicolo") REFERENCES "veicolo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dati_specifici" ADD CONSTRAINT "fk_dati_specifici_veicolo" FOREIGN KEY ("id_veicolo") REFERENCES "veicolo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "storico_intervento" ADD CONSTRAINT "storico_intervento_id_veicolo_fkey" FOREIGN KEY ("id_veicolo") REFERENCES "veicolo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prenotazione" ADD CONSTRAINT "prenotazioni_id_utente_fkey" FOREIGN KEY ("id_utente") REFERENCES "utente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prenotazione" ADD CONSTRAINT "prenotazioni_id_officina_fkey" FOREIGN KEY ("id_officina") REFERENCES "officina"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recensione" ADD CONSTRAINT "recensione_id_prenotazione_fkey" FOREIGN KEY ("id_prenotazione") REFERENCES "prenotazione"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
