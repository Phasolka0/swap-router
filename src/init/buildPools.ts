import {Pool, Tick, Token} from '@phasolka0/alcor-swap-sdk'
import {asset} from 'eos-common'


export let allPools: Array<Pool> = []
export let allPoolsMap: { [tokenId: string]: Pool[] } = {};
export let tokens: Map<string, Token> = new Map()

export function parseToken(token: any) {
    return new Token(
        token.contract,
        asset(token.quantity).symbol.precision(),
        asset(token.quantity).symbol.code().to_string(),
        //(asset(token.quantity).symbol.code().to_string() + '-' + token.contract).toLowerCase()
    )
}

export function buildPools(pools: Array<any>) {
    for (const pool of pools) {
        const {rawPool, ticks} = pool
        const {tokenA, tokenB, currSlot: {sqrtPriceX64, tick}} = rawPool
        const parsedTokenA = parseToken(tokenA)
        const parsedTokenB = parseToken(tokenB)

        const simplePool = new Pool({
            ...rawPool,
            tokenA: parsedTokenA,
            tokenB: parsedTokenB,
            sqrtPriceX64,
            tickCurrent: tick,
            ticks: ticks.sort((a: Tick, b: Tick) => a.id - b.id)
        })
        allPools.push(simplePool)
        //if (!parsedTokenA || !parsedTokenB) throw new Error('!parsedTokenA || !parsedTokenB')
        //const idA = parsedTokenA.id || ''
        //const idB = parsedTokenB.id || ''

        //const alcorPoolA = new AlcorPool(idA, idB, simplePool)
        //const alcorPoolB = new AlcorPool(idB, idA, simplePool)
        tokens.set(parsedTokenA.id, parsedTokenA)
        tokens.set(parsedTokenB.id, parsedTokenB)
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

    allPools.forEach((pool) => {
        const tokenAId = pool.tokenA.id;
        const tokenBId = pool.tokenB.id;
        allPoolsMap[tokenAId] = allPoolsMap[tokenAId] || [];
        allPoolsMap[tokenBId] = allPoolsMap[tokenBId] || [];
        allPoolsMap[tokenAId].push(pool);
        allPoolsMap[tokenBId].push(pool);
    });
}