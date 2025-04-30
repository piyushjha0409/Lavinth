"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = require("dotenv");
var pg_1 = require("pg");
dotenv.config();
var pool = new pg_1.Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '33181'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// Test the connection
pool.on('connect', function () {
    console.log('Connected to TimescaleDB');
});
pool.on('error', function (err) {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
exports.default = pool;
