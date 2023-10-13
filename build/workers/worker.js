"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerExpose = void 0;
const threads_1 = require("threads");
const buildPools_1 = require("../init/old/buildPools");
async function init(serializedPools) {
    (0, buildPools_1.buildPools)(JSON.parse(serializedPools));
}
exports.WorkerExpose = {
    init
};
(0, threads_1.expose)(exports.WorkerExpose);
