"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const settings_1 = require("../settings");
const express_1 = __importDefault(require("express"));
const msgpack_lite_1 = __importDefault(require("msgpack-lite"));
const alcor_swap_sdk_1 = require("@phasolka0/alcor-swap-sdk");
const buildPools_1 = require("../init/old/buildPools");
const utils_1 = require("../utils/utils");
const lodash_1 = require("lodash");
const TRADE_OPTIONS = { maxNumResults: 1, maxHops: 3 };
const ROUTES = new Map();
function getRoutesOld(inputTokenID, outputTokenID, maxHops = 2) {
    const cache_key = `${inputTokenID}-${outputTokenID}-${maxHops}`;
    if (ROUTES.has(cache_key)) {
        return ROUTES.get(cache_key);
    }
    // We pass chain to keep cache for different chains
    const input = buildPools_1.allPools.find(p => p.tokenA.id == inputTokenID)?.tokenA || buildPools_1.allPools.find(p => p.tokenB.id == inputTokenID)?.tokenB;
    const output = buildPools_1.allPools.find(p => p.tokenA.id == outputTokenID)?.tokenA || buildPools_1.allPools.find(p => p.tokenB.id == outputTokenID)?.tokenB;
    let routes;
    if (typeof input !== 'undefined' && typeof output !== 'undefined') {
        routes = (0, alcor_swap_sdk_1.computeAllRoutes)(input, output, buildPools_1.allPools, maxHops);
    }
    // Caching
    // if (typeof routes !== 'undefined') {
    //     ROUTES.set(cache_key, routes);
    // }
    return routes;
}
function getRoutes(inputTokenID, outputTokenID, maxHops = 2) {
    const cache_key = `${inputTokenID}-${outputTokenID}-${maxHops}`;
    if (ROUTES.has(cache_key)) {
        return ROUTES.get(cache_key);
    }
    const input = buildPools_1.tokens.get(inputTokenID);
    const output = buildPools_1.tokens.get(outputTokenID);
    //console.log(input, output)
    const routes = (0, alcor_swap_sdk_1.computeAllRoutesFromMap)(input, output, buildPools_1.allPoolsMap, maxHops);
    //ROUTES.set(cache_key, routes);
    return routes;
}
function cacheAllPossibleRoutes(maxHops = 2) {
    const allTokenIDs = Object.keys(buildPools_1.allPoolsMap);
    for (let i = 0; i < allTokenIDs.length; i++) {
        for (let j = 0; j < allTokenIDs.length; j++) {
            if (i !== j) {
                const inputTokenID = allTokenIDs[i];
                const outputTokenID = allTokenIDs[j];
                const cache_key = `${inputTokenID}-${outputTokenID}-${maxHops}`;
                if (!ROUTES.has(cache_key)) {
                    const input = buildPools_1.allPoolsMap[inputTokenID]?.[0]?.tokenA || buildPools_1.allPoolsMap[inputTokenID]?.[0]?.tokenB;
                    const output = buildPools_1.allPoolsMap[outputTokenID]?.[0]?.tokenA || buildPools_1.allPoolsMap[outputTokenID]?.[0]?.tokenB;
                    const routes = (0, alcor_swap_sdk_1.computeAllRoutesFromMap)(input, output, buildPools_1.allPoolsMap, maxHops);
                    console.log(routes);
                    ROUTES.set(cache_key, routes);
                }
            }
        }
    }
}
function compareRoutes(routesOld, routesNew) {
    let missingRoutes = [];
    // Проверяем каждый роут из старой версии
    for (let i = 0; i < routesOld.length; i++) {
        const routeOld = routesOld[i];
        const existsInNew = routesNew.some(routeNew => routeOld.equals(routeNew));
        if (!existsInNew) {
            missingRoutes.push(routeOld);
        }
    }
    if (missingRoutes.length > 0) {
        console.log("Missing routes in new version:");
        missingRoutes.forEach(route => console.log(route));
    }
    else {
        console.log("All routes from old version exist in new version.");
    }
}
function startServer() {
    const app = (0, express_1.default)();
    app.listen(settings_1.mainThreadPort, '127.0.0.1', async () => {
        console.log('MainThread started');
        await alcor_swap_sdk_1.Trade.initWorkerPool(16);
        // const startTime = Date.now()
        // cacheAllPossibleRoutes()
        // console.log('cacheAllPossibleRoutes', Date.now() - startTime)
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
        amount = (0, utils_1.tryParseCurrencyAmount)(amount, exactIn ? inputToken : outputToken);
        if (!amount)
            return res.status(403).send('Invalid amount');
        const startTime = performance.now();
        let trade;
        if (exactIn) {
            const startTime = Date.now();
            const routes = getRoutes(input, output, Math.min(maxHops, 3));
            if (routes) {
                const route = alcor_swap_sdk_1.Route.toJSON(routes[0]);
                const buffer = msgpack_lite_1.default.encode(route);
                const deserialized = msgpack_lite_1.default.decode(buffer);
                console.log('deserialized isEqual:', (0, lodash_1.isEqual)(route, deserialized));
            }
            console.log('getRoutes', Date.now() - startTime);
            if (typeof routes !== 'undefined') {
                await alcor_swap_sdk_1.Trade.bestTradeExactIn3(routes, buildPools_1.allPools, amount, Math.min(3, maxHops));
            }
            else {
                res.status(403).send('No route found');
            }
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
        // const endTime = performance.now()
        //
        // console.log(`find route took maxHops('${TRADE_OPTIONS.maxHops}') ${endTime - startTime} milliseconds`)
        //
        // if (!trade) return res.status(403).send('No route found')
        //
        // const method = exactIn ? 'swapexactin' : 'swapexactout'
        // const route = trade.route.pools.map(p => p.id)
        //
        // const maxSent = exactIn ? trade.inputAmount : trade.maximumAmountIn(slippage)
        // const minReceived = exactIn ? trade.minimumAmountOut(slippage) : trade.outputAmount
        //
        // // Memo Format <Service Name>#<Pool ID's>#<Recipient>#<Output Token>#<Deadline>
        // const memo = `${method}#${route.join(',')}#${receiver}#${minReceived.toExtendedAsset()}#0`
        //
        // const result = {
        //     input: trade.inputAmount.toFixed(),
        //     output: trade.outputAmount.toFixed(),
        //     minReceived: minReceived.toFixed(),
        //     maxSent: maxSent.toFixed(),
        //     priceImpact: trade.priceImpact.toSignificant(2),
        //     memo,
        //     route,
        //     executionPrice: {
        //         numerator: trade.executionPrice.numerator.toString(),
        //         denominator: trade.executionPrice.denominator.toString()
        //     }
        // }
        // console.log(result)
        // res.json(result)
    });
}
exports.startServer = startServer;
