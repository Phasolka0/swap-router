"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartCalculatePool = exports.SmartWorker = void 0;
const threads_1 = require("threads");
const settings_js_1 = require("../settings.js");
class SmartWorker {
    id;
    workerInstance;
    workTimeHistory;
    endWorkTime;
    constructor(id, workerInstance) {
        this.id = id;
        this.workerInstance = workerInstance;
        this.workTimeHistory = [];
        this.endWorkTime = 0;
    }
    static async create(id, workerScript) {
        const workerInstance = await (0, threads_1.spawn)(new threads_1.Worker(workerScript));
        return new SmartWorker(id, workerInstance);
    }
}
exports.SmartWorker = SmartWorker;
class SmartCalculatePool {
    resultsArray = [];
    tokenToTasks;
    initializedTokens = false;
    workers = [];
    constructor() {
        this.tokenToTasks = new Map();
        this.initializedTokens = false;
    }
    static async create(workerScript, options = { size: settings_js_1.threadsCount }) {
        const instance = new SmartCalculatePool();
        const promises = Array.from({ length: options.size }, (_, id) => SmartWorker.create(id, workerScript));
        instance.workers = await Promise.all(promises);
        return instance;
    }
    addTask(taskOptions) {
        this.tokenToTasks.set(this.tokenToTasks.size, taskOptions);
    }
    async waitForWorkersAndReturnResult() {
        this.resultsArray = [];
        await Promise.all(this.workers.map(async (worker) => {
            await this.workerLoop(worker);
        }));
        return this.resultsArray;
    }
    async workerLoop(worker) {
        while (this.tokenToTasks.size !== 0) {
            const token = this.tokenToTasks.keys().next().value;
            const taskOptions = this.tokenToTasks.get(token);
            if (!taskOptions)
                break;
            this.tokenToTasks.delete(token);
            console.log(taskOptions);
            const result = await worker.workerInstance.fromRoute(taskOptions);
            if (result) {
                this.resultsArray.push(result);
            }
        }
    }
}
exports.SmartCalculatePool = SmartCalculatePool;
