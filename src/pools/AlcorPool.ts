import {alcorContract, endpoint, rpc} from "../settings";
import {fetchAllRows} from "../utils/utils";
import Abi from "../Abi/Abi";
export default class  {
    static abi = new Abi()
    // idIn: string
    // idOut: string
    // constructor(idIn: string, idOut: string, pool: Pool) {
    // }

    static async fetchAllPools() {
        const allPools: Array<any> = []
        const alcorRawPools = await fetchAllRows(rpc,{
            code: alcorContract,
            scope: alcorContract,
            table: 'pools'
        })

        await Promise.all(alcorRawPools.map(async (pool: any) => {
            if (!+pool.active) {
                return
            }
            // const contractA = pool.tokenA.contract
            // const contractB = pool.tokenB.contract
            //
            // const quantityA = pool.tokenA.quantity.split(' ')
            // const quantityB = pool.tokenB.quantity.split(' ')
            //
            // const decimalsA = countDecimals(quantityA[0])
            // const decimalsB = countDecimals(quantityB[0])
            //
            // const symbolA = decimalsA + ',' + quantityA[1]
            // const symbolB = decimalsB + ',' + quantityB[1]
            //
            // const tokenA = contractA + ':' + symbolA
            // const tokenB = contractB + ':' + symbolB

            const ticks = await this.getTicks(pool.id)
            const fullPool = {
                rawPool: pool,
                ticks: ticks,
            }

            if (fullPool.ticks.length > 0) {
                allPools.push(fullPool)
            }
        }))
        return allPools
    }

    static async getTicks(poolId: number) {
        const indexName = 'id'
        const options = {
            json: false,
            lower_bound: 0,
            upper_bound: undefined,
            limit: 9999,
            scope: poolId,
            table: 'ticks',
            code: alcorContract,
        }

        let rows: any = []
        let lowerBound = options.lower_bound
        for (let i = 0; i < Infinity; i += 1) {

            const rawResponse = await fetch(endpoint + '/v1/chain/get_table_rows', {
                method: 'POST',
                body: JSON.stringify({
                    ...options,
                    lower_bound: lowerBound
                }),
            })
            const json = await rawResponse.json()
            const result = await this.abi.deserializeManyTables(alcorContract, 'ticks', json.rows)
            rows = rows.concat(result)

            if (!json.more || result.length === 0) break

            if (typeof json.next_key !== 'undefined') {
                lowerBound = json.next_key
            } else {
                lowerBound =
                    Number.parseInt(
                        `${result[result.length - 1][indexName]}`,
                        10
                    ) + 1
            }
        }

        return rows
    }
}