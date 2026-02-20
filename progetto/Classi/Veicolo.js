"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Veicolo = void 0;
var uuid_1 = require("uuid");
var Veicolo = /** @class */ (function () {
    //*costruttore classe
    function Veicolo(_targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi) {
        this._id_veicolo = (0, uuid_1.v4)();
        this._targa = _targa;
        this.marca = marca;
        this.modello = modello;
        this.alimentazione = alimentazione;
        this.cambio = cambio;
        this.dataRevisione = dataRevisione;
        this.dataRca = dataRca;
        this.kmPercorsi = kmPercorsi;
    }
    Object.defineProperty(Veicolo.prototype, "id_veicolo", {
        get: function () {
            return this._id_veicolo;
        },
        set: function (id_veicolo) {
            this._id_veicolo = id_veicolo;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Veicolo.prototype, "targa", {
        get: function () {
            return this._targa;
        },
        set: function (targa) {
            this._targa = targa;
        },
        enumerable: false,
        configurable: true
    });
    //*metodi classe
    Veicolo.prototype.updateTarga = function (newTarga) {
        this._targa = newTarga;
    };
    Veicolo.prototype.updateMarca = function (newMarca) {
        this.marca = newMarca;
    };
    Veicolo.prototype.updateModello = function (newModello) {
        this.modello = newModello;
    };
    Veicolo.prototype.updateAlimentazione = function (newAlimentazione) {
        this.alimentazione = newAlimentazione;
    };
    Veicolo.prototype.updateCambio = function (newCambio) {
        this.cambio = newCambio;
    };
    Veicolo.prototype.calcolaConsumoMedio = function (kmPercorsi, litriConsumati) {
        return (litriConsumati / kmPercorsi) * 100;
    };
    Veicolo.prototype.isRevisioneScaduta = function () {
        var oggi = new Date();
        return this.dataRevisione < oggi;
    };
    Veicolo.prototype.isRcaScaduta = function () {
        var oggi = new Date();
        return this.dataRca < oggi;
    };
    Veicolo.prototype.descrizioneCompleta = function () {
        console.log("".concat(this.marca, " ").concat(this.modello, " ").concat(this._targa, " ").concat(this.kmPercorsi, " - ").concat(this.alimentazione, ", cambio: ").concat(this.cambio, ", data revisione: ").concat(this.dataRevisione, ", data rca: ").concat(this.dataRca));
    };
    return Veicolo;
}());
exports.Veicolo = Veicolo;
