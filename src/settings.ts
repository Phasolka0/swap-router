import {Api, JsonRpc} from "eosjs";
import {TextDecoder, TextEncoder} from "util";
import {JsSignatureProvider} from "eosjs/dist/eosjs-jssig";


export const mainThreadPort = 9603

export const endpoint = 'http://127.0.0.1:8888'
export const rpc = new JsonRpc(endpoint, {fetch});
export const signatureProvider = new JsSignatureProvider([]);

export const threadsCount = 1
export const alcorContract = 'swap.alcor'