"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRecord = exports.setUserClaims = void 0;
/**
 * Entry point – re-export các hàm cần deploy (Gen2).
 */
var set_claims_1 = require("./set-claims");
Object.defineProperty(exports, "setUserClaims", { enumerable: true, get: function () { return set_claims_1.setUserClaims; } });
var add_record_1 = require("./add-record");
Object.defineProperty(exports, "addRecord", { enumerable: true, get: function () { return add_record_1.addRecord; } });
