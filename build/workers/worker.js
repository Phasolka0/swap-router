"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerExpose = void 0;
const threads_1 = require("threads");
const buildPools_1 = require("../init/old/buildPools");
const alcor_swap_sdk_1 = require("@phasolka0/alcor-swap-sdk");
async function init(serializedPools) {
    (0, buildPools_1.buildPools)(JSON.parse(serializedPools));
}
function fromRoute(options) {
    return alcor_swap_sdk_1.Trade.fromRoute(options.route, options.currencyAmountIn, options.tradeType);
}
exports.WorkerExpose = {
    init,
    fromRoute
};
(0, threads_1.expose)(exports.WorkerExpose);
