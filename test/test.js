const {mainThreadPort} = require("../build/settings");

async function main() {
    let responses = []
    for (let i = 0; i < 1; i++) {
        responses.push(fetch('http://localhost:' + mainThreadPort + '/getRoute?' +
            'trade_type=EXACT_OUTPUT&' +
            'input=wax-eosio.token&' +
            'output=tlm-alien.worlds&' +
            'amount=1.0000&slippage=0.30&' +
            'receiver=unobe.wam&maxHops=3'))
    }
    responses = await Promise.all(responses.map(async promise => {
        const result = await promise
        return result.json()
    }))


    console.log(responses)
}

main()