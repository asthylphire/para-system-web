<?php
// Database connection (PDO). Edit these 4 constants to match your setup.
const DB_HOST = 'sql107.infinityfree.com';
const DB_NAME = 'if0_43221477_para_db';
const DB_USER = 'if0_43221477';     // limited user, created with create_db_user.sql
const DB_PASS = 'MxA4sFfieFOYyEt';    // change this in BOTH db.php and create_db_user.sql

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // throw on SQL errors
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,                  // real prepared statements
                PDO::MYSQL_ATTR_FOUND_ROWS   => true,                   // rowCount() = rows matched
            ]
        );
    }
    return $pdo;
}
