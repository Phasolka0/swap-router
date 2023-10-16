"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPools = exports.parseToken = exports.tokens = exports.allPoolsMap = exports.allPools = void 0;
const alcor_swap_sdk_1 = require("@phasolka0/alcor-swap-sdk");
const eos_common_1 = require("eos-common");
exports.allPools = [];
exports.allPoolsMap = {};
exports.tokens = new Map();
function parseToken(token) {
    return new alcor_swap_sdk_1.Token(token.contract, (0, eos_common_1.asset)(token.quantity).symbol.precision(), (0, eos_common_1.asset)(token.quantity).symbol.code().to_string());
}
exports.parseToken = parseToken;
function buildPools(pools) {
    for (const pool of pools) {
        const { rawPool, ticks } = pool;
        const { tokenA, tokenB, currSlot: { sqrtPriceX64, tick } } = rawPool;
        const parsedTokenA = parseToken(tokenA);
        const parsedTokenB = parseToken(tokenB);
        const simplePool = new alcor_swap_sdk_1.Pool({
            ...rawPool,
            tokenA: parsedTokenA,
            tokenB: parsedTokenB,
            sqrtPriceX64,
            tickCurrent: tick,
            ticks: ticks.sort((a, b) => a.id - b.id)
        });
        exports.allPools.push(simplePool);
        //if (!parsedTokenA || !parsedTokenB) throw new Error('!parsedTokenA || !parsedTokenB')
        //const idA = parsedTokenA.id || ''
        //const idB = parsedTokenB.id || ''
        //const alcorPoolA = new AlcorPool(idA, idB, simplePool)
        //const alcorPoolB = new AlcorPool(idB, idA, simplePool)
        exports.tokens.set(parsedTokenA.id, parsedTokenA);
        exports.tokens.set(parsedTokenB.id, parsedTokenB);
        //
        //
        // if (!allPools[idA]) {
        //     tokenIdToPools.set(idA, new Map())
        // }
        // if (!tokenIdToPools.has(idB)) {
        //     tokenIdToPools.set(idB, new Map())
        // }
        //
        // const poolsA = tokenIdToPools.get(idA)
    }
    exports.allPools.forEach((pool) => {
        const tokenAId = pool.tokenA.id;
        const tokenBId = pool.tokenB.id;
        exports.allPoolsMap[tokenAId] = exports.allPoolsMap[tokenAId] || [];
        exports.allPoolsMap[tokenBId] = exports.allPoolsMap[tokenBId] || [];
        exports.allPoolsMap[tokenAId].push(pool);
        exports.allPoolsMap[tokenBId].push(pool);
    });
}
exports.buildPools = buildPools;
