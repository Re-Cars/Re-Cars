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
var Auto = /** @class */ (function (_super) {
    __extends(Auto, _super);
    //*costruttore classe
    function Auto(_targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi, id_auto, numPorte) {
        var _this = _super.call(this, _targa, marca, modello, alimentazione, cambio, dataRevisione, dataRca, kmPercorsi) || this;
        _this.id_auto = (0, uuid_1.v4)();
        _this.numPorte = numPorte;
        return _this;
    }
    //*metodi classe
    Auto.prototype.alertManutenzione = function () {
        var intervalloManutenzione = 20000;
        if (this.kmPercorsi >= intervalloManutenzione) {
            console.log("manutenzione necessaria!");
            return true;
        }
        else {
            console.log("tutto ok, manutenzione non necessaria!");
            return false;
        }
    };
    return Auto;
}(Veicolo_1.Veicolo));
