-- Notifiche push (PWA): dispositivi iscritti e notifiche programmate già
-- inviate (per non mandare doppioni se il controllo giornaliero gira più volte).

-- CreateTable
CREATE TABLE "push_iscrizione" (
    "id" SERIAL NOT NULL,
    "id_utente" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" VARCHAR(200) NOT NULL,
    "auth" VARCHAR(100) NOT NULL,
    "creato_il" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_iscrizione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifica_inviata" (
    "id" SERIAL NOT NULL,
    "id_utente" INTEGER NOT NULL,
    "chiave" VARCHAR(120) NOT NULL,
    "inviata_il" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifica_inviata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_iscrizione_endpoint_key" ON "push_iscrizione"("endpoint");

-- CreateIndex
CREATE INDEX "push_iscrizione_id_utente_idx" ON "push_iscrizione"("id_utente");

-- CreateIndex
CREATE UNIQUE INDEX "notifica_inviata_id_utente_chiave_key" ON "notifica_inviata"("id_utente", "chiave");

-- AddForeignKey
ALTER TABLE "push_iscrizione" ADD CONSTRAINT "push_iscrizione_id_utente_fkey" FOREIGN KEY ("id_utente") REFERENCES "utente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifica_inviata" ADD CONSTRAINT "notifica_inviata_id_utente_fkey" FOREIGN KEY ("id_utente") REFERENCES "utente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

