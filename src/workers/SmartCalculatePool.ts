import {spawn, Thread, Worker} from 'threads';
import {threadsCount} from '../settings.js';

export class SmartWorker {
    id: number
    workerInstance: any

    workTimeHistory: Array<number>
    endWorkTime: number
    constructor(id: number, workerInstance: any, ) {
        this.id = id;
        this.workerInstance = workerInstance;
        this.workTimeHistory = []
        this.endWorkTime = 0
    }

    static async create(id: number, workerScript: string) {
        const workerInstance = await spawn(new Worker(workerScript));
        return new SmartWorker(id, workerInstance);
    }


    // endWorkerWork() {
    //     this.currentWorkType = ''
    //     this.endWorkTime = performance.now()
    // }
    //
    // endPoolWork(time: number) {
    //     this.workTimeHistory.push(time - this.endWorkTime)
    //     if (this.workTimeHistory.length > 10) {
    //         const averageTime = average(this.workTimeHistory)
    //         //console.log(this.id, averageTime)
    //         this.workTimeHistory.shift()
    //     }
    // }
    //
    // updateTaskCount() {
    //     let count = 0;
    //     for (const token of this.primaryTokens) {
    //         if (this.pool.tokenToTasks.has(token)) {
    //             count++;
    //         }
    //     }
    //     this.taskCount = count;
    // }


}

export class SmartCalculatePool {
    resultsArray: Array<any> = []
    tokenToTasks: Map<number, any>
    initializedTokens = false
    workers: Array<SmartWorker> = []
    constructor() {
        this.tokenToTasks = new Map()
        this.initializedTokens = false
    }

    static async create(workerScript: string, options = {size: threadsCount}) {
        const instance = new SmartCalculatePool();
        const promises = Array.from({length: options.size}, (_, id) =>
            SmartWorker.create(id, workerScript));
        instance.workers = await Promise.all(promises);
        return instance;
    }

    addTask(taskOptions: any) {
        this.tokenToTasks.set(this.tokenToTasks.size, taskOptions);
    }

    async waitForWorkersAndReturnResult() {
        this.resultsArray = []
        await Promise.all(this.workers.map(async worker => {
            await this.workerLoop(worker)
        }))
        return this.resultsArray
    }

    async workerLoop(worker: SmartWorker) {
        while (this.tokenToTasks.size !== 0) {
            const token = this.tokenToTasks.keys().next().value;
            const taskOptions = this.tokenToTasks.get(token)
            if (!taskOptions) break
            this.tokenToTasks.delete(token)
            console.log(taskOptions)
            const result = await worker.workerInstance.fromRoute(taskOptions)
            if (result) {
                this.resultsArray.push(result)
            }
        }
    }
}
