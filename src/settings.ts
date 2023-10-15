import {JsonRpc} from "eosjs";


export const mainThreadPort = 9603

export const endpoint = 'http://127.0.0.1:8888'
export const rpc = new JsonRpc(endpoint, {fetch});
export const alcorContract = 'swap.alcor'