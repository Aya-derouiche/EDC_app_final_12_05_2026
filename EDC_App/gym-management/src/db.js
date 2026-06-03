const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool(config.db);
const query = (text, params = []) => pool.query(text, params);

module.exports = { pool, query };
