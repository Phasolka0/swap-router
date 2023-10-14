import AlcorPool from "../../pools/AlcorPool";
import {createPool} from "../../workers/createWorkerPool";
import {startServer} from "../../server/server";
import {buildPools} from "./buildPools";

export default async function () {
    const startTime = Date.now()
    const allPools = await AlcorPool.fetchAllPools()
    buildPools(allPools)
    await createPool(allPools)
    startServer()
    console.log('init time:', Date.now() - startTime)

}