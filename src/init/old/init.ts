import AlcorPool from "../../pools/AlcorPool";
import {startServer} from "../../server/server";
import {allPools, buildPools} from "./buildPools";
import {Trade} from "@phasolka0/alcor-swap-sdk";

export default async function () {
    const startTime = Date.now()
    const rawPools = await AlcorPool.fetchAllPools()
    buildPools(rawPools)
    await Trade.initWorkerPool(7)

    // Prepare pools on workers, optionally
    //await Trade.workerPool.updatePools(allPools)
    startServer()
    console.log('init time:', Date.now() - startTime)

}