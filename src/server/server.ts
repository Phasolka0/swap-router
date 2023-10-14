import {mainThreadPort} from "../settings";
import express from 'express'
import msgpack from "msgpack-lite";
import {
    computeAllRoutes,
    computeAllRoutesFromMap,
    CurrencyAmount,
    Percent,
    Route, Token,
    Trade
} from "@phasolka0/alcor-swap-sdk";
import {allPools, allPoolsMap, tokens} from "../init/old/buildPools";
import {tryParseCurrencyAmount} from "../utils/utils";
import { isEqual } from 'lodash';
import {equal} from "assert";

const TRADE_OPTIONS = { maxNumResults: 1, maxHops: 3 }
const ROUTES: Map<string, Route<Token, Token>[]> = new Map();

function getRoutesOld(inputTokenID: string, outputTokenID: string, maxHops = 2) {
    const cache_key = `${inputTokenID}-${outputTokenID}-${maxHops}`

    if (ROUTES.has(cache_key)) {
        return ROUTES.get(cache_key);
    }

    // We pass chain to keep cache for different chains
    const input = allPools.find(p => p.tokenA.id == inputTokenID)?.tokenA || allPools.find(p => p.tokenB.id == inputTokenID)?.tokenB
    const output = allPools.find(p => p.tokenA.id == outputTokenID)?.tokenA || allPools.find(p => p.tokenB.id == outputTokenID)?.tokenB
    let routes
    if (typeof input !== 'undefined' && typeof output !== 'undefined') {
        routes = computeAllRoutes(input, output, allPools, maxHops)
    }


    // Caching
    // if (typeof routes !== 'undefined') {
    //     ROUTES.set(cache_key, routes);
    // }


    return routes;
}
function getRoutes(inputTokenID: any, outputTokenID: any, maxHops = 2) {
    const cache_key = `${inputTokenID}-${outputTokenID}-${maxHops}`;

    if (ROUTES.has(cache_key)) {
        return ROUTES.get(cache_key);
    }

    const input = tokens.get(inputTokenID)
    const output = tokens.get(outputTokenID)

    //console.log(input, output)
    const routes = computeAllRoutesFromMap(input, output, allPoolsMap, maxHops);

    //ROUTES.set(cache_key, routes);

    return routes;
}
function cacheAllPossibleRoutes(maxHops = 2) {
    const allTokenIDs = Object.keys(allPoolsMap);

    for (let i = 0; i < allTokenIDs.length; i++) {
        for (let j = 0; j < allTokenIDs.length; j++) {
            if (i !== j) {
                const inputTokenID = allTokenIDs[i];
                const outputTokenID = allTokenIDs[j];

                const cache_key = `${inputTokenID}-${outputTokenID}-${maxHops}`;

                if (!ROUTES.has(cache_key)) {
                    const input = allPoolsMap[inputTokenID]?.[0]?.tokenA || allPoolsMap[inputTokenID]?.[0]?.tokenB;
                    const output = allPoolsMap[outputTokenID]?.[0]?.tokenA || allPoolsMap[outputTokenID]?.[0]?.tokenB;

                    const routes = computeAllRoutesFromMap(input, output, allPoolsMap, maxHops);
                    console.log(routes)
                    ROUTES.set(cache_key, routes);
                }
            }
        }
    }
}

function compareRoutes(routesOld: Route<Token, Token>[], routesNew: Route<Token, Token>[]): void {
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
        missingRoutes.forEach(route => console.log(route))
    } else {
        console.log("All routes from old version exist in new version.");
    }
}


export function startServer() {
    const app = express()


    app.listen(mainThreadPort, '127.0.0.1', async () => {
        console.log('MainThread started');
        await Trade.initWorkerPool(16)
        // const startTime = Date.now()
        // cacheAllPossibleRoutes()
        // console.log('cacheAllPossibleRoutes', Date.now() - startTime)
    });

    app.get('/getRoute', async (req, res) => {
        console.log('getRoute')
        console.log(req.query)

        let { trade_type, input, output, amount, slippage, receiver = '<receiver>', maxHops } = <any>req.query

        if (!trade_type || !input || !output || !amount)
            return res.status(403).send('Invalid request')

        if (!slippage) slippage = 0.3
        slippage = new Percent(slippage * 100, 10000)

        // Max hoop can be only 3 due to perfomance
        if (maxHops !== undefined) TRADE_OPTIONS.maxHops = Math.min(parseInt(maxHops), 3)

        const exactIn = trade_type == 'EXACT_INPUT'


        //input = tokens.get(input)
        //output = tokens.get(output)
        const inputToken = allPools.find(p => p.tokenA.id == input)?.tokenA || allPools.find(p => p.tokenB.id == input)?.tokenB
        const outputToken = allPools.find(p => p.tokenA.id == output)?.tokenA || allPools.find(p => p.tokenB.id == output)?.tokenB
        //console.log(input)
        if (!input || !output) return res.status(403).send('Invalid input/output')

        amount = tryParseCurrencyAmount(amount, exactIn ? inputToken  : outputToken)
        if (!amount) return res.status(403).send('Invalid amount')

        const startTime = performance.now()

        let trade
        if (exactIn) {
            const startTime = Date.now()
            const routes = getRoutes(input, output, Math.min(maxHops, 3))
            if (routes) {
                const route = Route.toJSON(routes[0])
                const buffer = msgpack.encode(route)
                const deserialized = msgpack.decode(buffer)
                console.log('deserialized isEqual:', isEqual(route, deserialized))
            }




            console.log('getRoutes', Date.now() - startTime)
            if (typeof routes !== 'undefined') {
                await Trade.bestTradeExactIn3(routes, allPools, amount, Math.min(3, maxHops))
            } else {
                res.status(403).send('No route found')
            }

            // } else {
            //   [trade] = await Trade.bestTradeExactIn(
            //     POOLS,
            //     amount,
            //     outputToken,
            //     { maxNumResults: 1, maxHops }
            //   )
            // }
        } else {
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
    })
}