"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryParseCurrencyAmount = exports.fetchAllRows = exports.countDecimals = void 0;
const alcor_swap_sdk_1 = require("@phasolka0/alcor-swap-sdk");
const jsbi_1 = __importDefault(require("jsbi"));
const units_1 = require("@ethersproject/units");
function countDecimals(str) {
    const index = str.indexOf('.');
    if (index === -1) {
        return 0;
    }
    else {
        return str.length - index - 1;
    }
}
exports.countDecimals = countDecimals;
async function fetchAllRows(rpc, options, indexName = 'id') {
    const mergedOptions = {
        json: true,
        lower_bound: 0,
        upper_bound: undefined,
        limit: 9999,
        ...options
    };
    let rows = [];
    let lowerBound = mergedOptions.lower_bound;
    for (let i = 0; i < Infinity; i += 1) {
        let result = await rpc.get_table_rows({
            ...mergedOptions,
            lower_bound: lowerBound
        });
        rows = rows.concat(result.rows);
        if (!result.more || result.rows.length === 0)
            break;
        // EOS 2.0 api
        // TODO Add 'more' key
        if (typeof result.next_key !== 'undefined') {
            lowerBound = result.next_key;
        }
        else {
            lowerBound =
                Number.parseInt(`${result.rows[result.rows.length - 1][indexName]}`, 10) + 1;
        }
    }
    return rows;
}
exports.fetchAllRows = fetchAllRows;
function tryParseCurrencyAmount(value, currency) {
    if (!value || !currency) {
        return undefined;
    }
    try {
        const typedValueParsed = (0, units_1.parseUnits)(value, currency.decimals).toString();
        if (typedValueParsed !== '0') {
            return alcor_swap_sdk_1.CurrencyAmount.fromRawAmount(currency, jsbi_1.default.BigInt(typedValueParsed));
        }
    }
    catch (error) {
        // fails if the user specifies too many decimal places of precision (or maybe exceed max uint?)
        console.debug(`Failed to parse input amount: "${value}"`, error);
    }
    return undefined;
}
exports.tryParseCurrencyAmount = tryParseCurrencyAmount;
