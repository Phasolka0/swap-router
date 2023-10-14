import {SmartCalculatePool, SmartWorker} from "./SmartCalculatePool";

export let pool: any

export async function createPool(rawPools: any) {
    const startTime = Date.now()
    pool = await SmartCalculatePool.create("./worker.js")
    const serializedPools = JSON.stringify(rawPools);

    await Promise.all(pool.workers.map(async (worker: SmartWorker) => {
        await worker.workerInstance.init(serializedPools)
    }))
    console.log('SmartCalculatePool created:', Date.now() - startTime)
}