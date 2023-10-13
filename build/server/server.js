"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const settings_1 = require("../settings");
const express_1 = __importDefault(require("express"));
const alcor_swap_sdk_1 = require("@phasolka0/alcor-swap-sdk");
const buildPools_1 = require("../init/old/buildPools");
const utils_1 = require("../utils/utils");
const ROUTES_CACHE_TIMEOUT = 60 * 60 * 1; // In seconds
const TRADE_OPTIONS = { maxNumResults: 1, maxHops: 3 };
const ROUTES = {};
function getRoutes(inputTokenID, outputTokenID, maxHops = 2) {
    const cache_key = `${inputTokenID}-${outputTokenID}-${maxHops}`;
    if (ROUTES[cache_key]) {
        return ROUTES[cache_key];
    }
    // We pass chain to keep cache for different chains
    const input = buildPools_1.allPools.find(p => p.tokenA.id == inputTokenID)?.tokenA || buildPools_1.allPools.find(p => p.tokenB.id == inputTokenID)?.tokenB;
    const output = buildPools_1.allPools.find(p => p.tokenA.id == outputTokenID)?.tokenA || buildPools_1.allPools.find(p => p.tokenB.id == outputTokenID)?.tokenB;
    // @ts-ignore
    const routes = (0, alcor_swap_sdk_1.computeAllRoutes)(input, output, buildPools_1.allPools, maxHops);
    // Caching
    ROUTES[cache_key] = routes;
    setTimeout(() => delete ROUTES[cache_key], ROUTES_CACHE_TIMEOUT * 1000);
    return routes;
}
function startServer() {
    const app = (0, express_1.default)();
    app.listen(settings_1.mainThreadPort, '127.0.0.1', async () => {
        console.log('MainThread started');
    });
    app.get('/getRoute', async (req, res) => {
        console.log('getRoute');
        console.log(req.query);
        let { trade_type, input, output, amount, slippage, receiver = '<receiver>', maxHops } = req.query;
        if (!trade_type || !input || !output || !amount)
            return res.status(403).send('Invalid request');
        if (!slippage)
            slippage = 0.3;
        slippage = new alcor_swap_sdk_1.Percent(slippage * 100, 10000);
        // Max hoop can be only 3 due to perfomance
        if (maxHops !== undefined)
            TRADE_OPTIONS.maxHops = Math.min(parseInt(maxHops), 3);
        const exactIn = trade_type == 'EXACT_INPUT';
        //input = tokens.get(input)
        //output = tokens.get(output)
        const inputToken = buildPools_1.allPools.find(p => p.tokenA.id == input)?.tokenA || buildPools_1.allPools.find(p => p.tokenB.id == input)?.tokenB;
        const outputToken = buildPools_1.allPools.find(p => p.tokenA.id == output)?.tokenA || buildPools_1.allPools.find(p => p.tokenB.id == output)?.tokenB;
        //console.log(input)
        if (!input || !output)
            return res.status(403).send('Invalid input/output');
        amount = (0, utils_1.tryParseCurrencyAmount)(amount, exactIn ? input : output);
        if (!amount)
            return res.status(403).send('Invalid amount');
        const startTime = performance.now();
        let trade;
        console.log(buildPools_1.allPools.length);
        if (exactIn) {
            // Doing with v2 function + caching routes
            //if (v2) {
            const routes = getRoutes(input, output, Math.min(maxHops, 3));
            [trade] = await alcor_swap_sdk_1.Trade.bestTradeExactIn2(routes, buildPools_1.allPools, amount, Math.min(3, maxHops));
            // } else {
            //   [trade] = await Trade.bestTradeExactIn(
            //     POOLS,
            //     amount,
            //     outputToken,
            //     { maxNumResults: 1, maxHops }
            //   )
            // }
        }
        else {
            // [trade] = await Trade.bestTradeExactOut(
            //     allPools,
            //     inputToken,
            //     amount,
            //     { maxNumResults: 1, maxHops }
            // )
        }
        const endTime = performance.now();
        console.log(`find route took maxHops('${TRADE_OPTIONS.maxHops}') ${endTime - startTime} milliseconds`);
        if (!trade)
            return res.status(403).send('No route found');
        const method = exactIn ? 'swapexactin' : 'swapexactout';
        const route = trade.route.pools.map(p => p.id);
        const maxSent = exactIn ? trade.inputAmount : trade.maximumAmountIn(slippage);
        const minReceived = exactIn ? trade.minimumAmountOut(slippage) : trade.outputAmount;
        // Memo Format <Service Name>#<Pool ID's>#<Recipient>#<Output Token>#<Deadline>
        const memo = `${method}#${route.join(',')}#${receiver}#${minReceived.toExtendedAsset()}#0`;
        const result = {
            input: trade.inputAmount.toFixed(),
            output: trade.outputAmount.toFixed(),
            minReceived: minReceived.toFixed(),
            maxSent: maxSent.toFixed(),
            priceImpact: trade.priceImpact.toSignificant(2),
            memo,
            route,
            executionPrice: {
                numerator: trade.executionPrice.numerator.toString(),
                denominator: trade.executionPrice.denominator.toString()
            }
        };
        console.log(result);
        res.json(result);
    });
}
exports.startServer = startServer;
