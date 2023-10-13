"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eosjs_1 = require("eosjs");
const settings_1 = require("../settings");
class Abi {
    raw;
    types;
    actions;
    structs;
    abiCache;
    rpc = settings_1.rpc;
    constructor() {
        this.raw = null;
        this.types = null;
        this.actions = {};
        this.structs = {};
        this.abiCache = {};
    }
    async loadAbi(account) {
        if (!this.abiCache.hasOwnProperty(account)) {
            const abi = (await this.rpc.get_abi(account)).abi;
            this.abiCache[account] = {
                raw: abi,
                types: eosjs_1.Serialize.getTypesFromAbi(eosjs_1.Serialize.createInitialTypes(), abi),
                actions: {},
                structs: {},
                tables: {}
            };
            for (let action of abi.actions) {
                this.abiCache[account].actions[action.name] = action;
            }
            for (let struct of abi.structs) {
                this.abiCache[account].structs[struct.name] = struct;
            }
            for (let table of abi.tables) {
                this.abiCache[account].tables[table.name] = table;
            }
        }
    }
    deserializeTableData(account, tableName, data) {
        const abi = this.abiCache[account];
        //console.log(abi.raw)
        const tableType = abi.tables[tableName];
        if (!tableType) {
            throw new Error(`Table ${tableName} not found in ABI`);
        }
        const tableTypeDef = abi.types.get(tableType.type);
        const buffer = new eosjs_1.Serialize.SerialBuffer({
            textEncoder: new TextEncoder(),
            textDecoder: new TextDecoder(),
            array: eosjs_1.Serialize.hexToUint8Array(data)
        });
        return tableTypeDef.deserialize(buffer);
    }
    async deserializeManyTables(account, tableName, tables) {
        await this.loadAbi(account);
        const results = [];
        tables.forEach(table => {
            results.push(this.deserializeTableData(account, tableName, table));
        });
        return results;
    }
}
exports.default = Abi;
