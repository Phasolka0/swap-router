import {expose} from "threads";
import {buildPools} from "../init/old/buildPools";
import {Trade} from "@phasolka0/alcor-swap-sdk";

async function init(serializedPools: string) {
    buildPools(JSON.parse(serializedPools))
}
function fromRoute(options: any) {
    return Trade.fromRoute(options.route, options.currencyAmountIn, options.tradeType)
}



export const WorkerExpose = {
    init,
    fromRoute
}
expose(WorkerExpose)