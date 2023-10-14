import {endpoint} from "../settings";
import {CurrencyAmount} from "@phasolka0/alcor-swap-sdk";
import JSBI from 'jsbi'
import { parseUnits } from '@ethersproject/units'

export function countDecimals(str: string) {
    const index = str.indexOf('.');
    if (index === -1) {
        return 0;
    } else {
        return str.length - index - 1;
    }
}
export async function fetchAllRows(rpc: any, options: any, indexName = 'id') {
    const mergedOptions = {
        json: true,
        lower_bound: 0,
        upper_bound: undefined,
        limit: 9999,
        ...options
    }

    let rows: any = []
    let lowerBound = mergedOptions.lower_bound

    for (let i = 0; i < Infinity; i += 1) {
        let result = await rpc.get_table_rows({
            ...mergedOptions,
            lower_bound: lowerBound
        })


        rows = rows.concat(result.rows)

        if (!result.more || result.rows.length === 0) break

        // EOS 2.0 api
        // TODO Add 'more' key
        if (typeof result.next_key !== 'undefined') {
            lowerBound = result.next_key
        } else {
            lowerBound =
                Number.parseInt(
                    `${result.rows[result.rows.length - 1][indexName]}`,
                    10
                ) + 1
        }
    }

    return rows
}

export function tryParseCurrencyAmount(value: any, currency: any) {
    if (!value || !currency) {
        return undefined
    }

    try {
        const typedValueParsed = parseUnits(value, currency.decimals).toString()
        if (typedValueParsed !== '0') {
            return CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed))
        }
    } catch (error) {
        // fails if the user specifies too many decimal places of precision (or maybe exceed max uint?)
        console.debug(`Failed to parse input amount: "${value}"`, error)
        console.log(currency)
    }
    return undefined
}