import {startServer} from "./server/server";
import init from "./init/old/init";

async function start() {
    await init()
}
start()