const mysql = require('mysql');
require('dotenv').config();

const dbConfig = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: 3306
});

module.exports = dbConfig;
