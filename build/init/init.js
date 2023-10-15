"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : {"default": mod};
};
Object.defineProperty(exports, "__esModule", {value: true});
const AlcorPool_1 = __importDefault(require("../pools/AlcorPool"));
const server_1 = require("../server/server");
const buildPools_1 = require("./buildPools");

async function default_1() {
    const startTime = Date.now();
    const allPools = await AlcorPool_1.default.fetchAllPools();
    (0, buildPools_1.buildPools)(allPools);
    (0, server_1.startServer)();
    console.log('init time:', Date.now() - startTime);
}

exports.default = default_1;
