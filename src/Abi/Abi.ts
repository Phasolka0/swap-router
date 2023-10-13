import {Serialize, Api, JsonRpc} from 'eosjs';
import fetch from 'node-fetch';
import {rpc} from "../settings";

class Abi {
    raw: any
    types: any
    actions: any
    structs: any
    abiCache: any
    rpc: any = rpc
    constructor() {
        this.raw = null;
        this.types = null;
        this.actions = {};
        this.structs = {};
        this.abiCache = {};
    }

    async loadAbi(account: string) {
        if (!this.abiCache.hasOwnProperty(account)) {
            const abi = (await this.rpc.get_abi(account)).abi
            this.abiCache[account] = {
                raw: abi,
                types: Serialize.getTypesFromAbi(Serialize.createInitialTypes(), abi),
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
    deserializeTableData(account: string, tableName: string, data: any) {
        const abi = this.abiCache[account];
        //console.log(abi.raw)
        const tableType = abi.tables[tableName];
        if (!tableType) {
            throw new Error(`Table ${tableName} not found in ABI`);
        }
        const tableTypeDef = abi.types.get(tableType.type);

        const buffer = new Serialize.SerialBuffer({
            textEncoder: new TextEncoder(),
            textDecoder: new TextDecoder(),
            array: Serialize.hexToUint8Array(data)
        });
        return tableTypeDef.deserialize(buffer);
    }
    async deserializeManyTables(account: string, tableName: string, tables: Array<any>) {
        await this.loadAbi(account);
        const results: any = []
        tables.forEach(table => {
            results.push(this.deserializeTableData(account, tableName, table))
        })
        return results
    }



}

export default Abi;
