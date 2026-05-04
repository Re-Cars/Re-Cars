"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Utente = void 0;
var uuid_1 = require("uuid");
var Utente = /** @class */ (function () {
    //costruttore classe
    function Utente(username, passwordHash, email, cellulare) {
        this.id_utente = (0, uuid_1.v4)();
        this.username = username;
        if (passwordHash.length > 15) {
            throw new Error("la password non può superare i 15 caratteri");
        }
        this.passwordHash = passwordHash;
        this.email = email;
        if (cellulare.length > 10) {
            throw new Error("il cellulare non può superare i 10 caratteri");
        }
        this.cellulare = cellulare;
        this.veicoli = [];
    }
    //metodi classe
    Utente.prototype.login = function (password) {
        if (password === this.passwordHash) {
            return true;
        }
        else {
            return false;
        }
    };
    Utente.prototype.updateUsername = function (newUsername) {
        this.username = newUsername;
    };
    Utente.prototype.updatePassword = function (newPassword) {
        if (newPassword.length > 15) {
            throw new Error("la password non può superare i 15 caratteri");
        }
        this.passwordHash = newPassword;
    };
    Utente.prototype.updateEmail = function (newEmail) {
        this.email = newEmail;
    };
    Utente.prototype.updateCellulare = function (newCellulare) {
        if (newCellulare.length > 10) {
            throw new Error("il cellulare non può superare i 10 caratteri");
        }
        this.cellulare = newCellulare;
    };
    Utente.prototype.addVeicolo = function (veicolo) {
        this.veicoli.push(veicolo);
    };
    Utente.prototype.stampaInfoUtente = function () {
        console.log("id_utente: ".concat(this.id_utente, " | username: ").concat(this.username, " | password: ").concat(this.passwordHash, " | email: ").concat(this.email, " | cellulare: ").concat(this.cellulare));
        if (this.veicoli.length === 0) {
            console.log("nessun veicolo registrato");
        }
        else {
            console.log("veicoli:");
        }
        for (var _i = 0, _a = this.veicoli; _i < _a.length; _i++) {
            var veicolo = _a[_i];
            console.log(veicolo);
        }
    };
    return Utente;
}());
exports.Utente = Utente;
