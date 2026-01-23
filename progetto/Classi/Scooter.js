"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Veicolo_1 = require("./Veicolo");
var uuid_1 = require("uuid");
var Scooter = /** @class */ (function (_super) {
    __extends(Scooter, _super);
    //costruttore classe
    function Scooter(_targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi, id_scooter, numRuote) {
        var _this = _super.call(this, _targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi) || this;
        _this.id_scooter = (0, uuid_1.v4)();
        _this.numRuote = numRuote;
        return _this;
    }
    //metodi classe
    Scooter.prototype.alertManutenzione = function () {
        var intervalloManutenzione = 5000;
        if (this.kmPercorsi >= intervalloManutenzione) {
            console.log("manutenzione necessaria!");
            return true;
        }
        else {
            console.log("tutto ok, manutenzione non necessaria!");
            return false;
        }
    };
    return Scooter;
}(Veicolo_1.Veicolo));
