import {mainThreadPort} from "../settings";
import express from 'express'
import msgpack from "msgpack-lite";
import {
    computeAllRoutes,
    computeAllRoutesFromMap,
    CurrencyAmount,
    Percent,
    Route, Token,
    Trade, TradeType
} from "@phasolka0/alcor-swap-sdk";
import {allPools, allPoolsMap, tokens} from "../init/buildPools";
import {tryParseCurrencyAmount} from "../utils/utils";
import {isEqual} from 'lodash';
import {equal} from "assert";

const TRADE_OPTIONS = {maxNumResults: 1, maxHops: 3}
const ROUTES: Map<string, Route<Token, Token>[]> = new Map();

function getRoutes(inputToken: Token, outputToken: Token, maxHops = 2) {
    const cache_key = `${inputToken.id}-${outputToken.id}-${maxHops}`;

    if (ROUTES.has(cache_key)) {
        return ROUTES.get(cache_key);
    }
    const routes = computeAllRoutesFromMap(inputToken, outputToken, allPoolsMap, maxHops);

    ROUTES.set(cache_key, routes);

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
    });

    app.get('/getRoute', async (req, res) => {

        let {trade_type, input, output, amount, slippage, receiver = '<receiver>', maxHops} = <any>req.query

        if (!trade_type || !input || !output || !amount)
            return res.status(403).send('Invalid request')

        if (trade_type !== TradeType[TradeType.EXACT_OUTPUT] && trade_type !== TradeType[TradeType.EXACT_INPUT])
            return res.status(403).send('Invalid trade_type')
        const exactIn = trade_type == 'EXACT_INPUT'
        trade_type = TradeType[trade_type]


        if (!slippage) slippage = 0.3
        slippage = new Percent(slippage * 100, 10000)

        // Max hoop can be only 3 due to perfomance
        if (maxHops !== undefined) TRADE_OPTIONS.maxHops = Math.min(parseInt(maxHops), 3)


        const inputToken = tokens.get(input)
        const outputToken = tokens.get(output)
        if (!inputToken || !outputToken) return res.status(403).send('Invalid input/output')

        amount = tryParseCurrencyAmount(amount, exactIn ? inputToken : outputToken)
        if (!amount) return res.status(403).send('Invalid amount')

        const startTime = performance.now()
        const routes = getRoutes(inputToken, outputToken, TRADE_OPTIONS.maxHops)
        if (!routes || routes.length === 0) return res.status(403).send('No route found')

        let trade
        try {
            trade = await Trade.bestTradeMultiThreads(routes, allPools, amount, trade_type)
        } catch (e) {
            console.log(e)
            trade = Trade.bestTradeSingleThread(routes, allPools, amount, trade_type)
        }

        const endTime = performance.now()

        console.log(`find route took maxHops('${TRADE_OPTIONS.maxHops}') ${endTime - startTime} milliseconds`)

        if (!trade) return res.status(403).send('No route found')

        const method = exactIn ? 'swapexactin' : 'swapexactout'
        const route = trade.route.pools.map(p => p.id)

        const maxSent = exactIn ? trade.inputAmount : trade.maximumAmountIn(slippage)
        const minReceived = exactIn ? trade.minimumAmountOut(slippage) : trade.outputAmount

        // Memo Format <Service Name>#<Pool ID's>#<Recipient>#<Output Token>#<Deadline>
        const memo = `${method}#${route.join(',')}#${receiver}#${minReceived.toExtendedAsset()}#0`

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
        }
        res.json(result)
    })
}