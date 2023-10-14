const {mainThreadPort} = require("../build/settings");

async function main() {
    const response = await fetch('http://localhost:' + mainThreadPort + '/getRoute?' +
        'trade_type=EXACT_INPUT&' +
        'input=wax-eosio.token&' +
        'output=tlm-alien.worlds&' +
        'amount=1.00000000&slippage=0.30&' +
        'receiver=unobe.wam&maxHops=3')

    console.log(await response.json())
}
main()