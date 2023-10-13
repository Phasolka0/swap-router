"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPool = exports.pool = void 0;
const SmartCalculatePool_1 = require("./SmartCalculatePool");
async function createPool(rawPools) {
    const startTime = Date.now();
    exports.pool = await SmartCalculatePool_1.SmartCalculatePool.create("./worker.js");
    const serializedPools = JSON.stringify(rawPools);
    await Promise.all(exports.pool.workers.map(async (worker) => {
        await worker.workerInstance.init(serializedPools);
    }));
    console.log('SmartCalculatePool created:', Date.now() - startTime);
}
exports.createPool = createPool;
