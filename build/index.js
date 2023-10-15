"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : {"default": mod};
};
Object.defineProperty(exports, "__esModule", {value: true});
const init_1 = __importDefault(require("./init/init"));

async function start() {
    await (0, init_1.default)();
}

start();
