"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alcorContract = exports.rpc = exports.endpoint = exports.mainThreadPort = void 0;
const eosjs_1 = require("eosjs");
exports.mainThreadPort = 9603;
exports.endpoint = 'http://127.0.0.1:8888';
exports.rpc = new eosjs_1.JsonRpc(exports.endpoint, { fetch });
exports.alcorContract = 'swap.alcor';
