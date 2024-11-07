<?php

$host = 'localhost';
$db = 'tower';
$user = 'root';
$password = '';

try {
    $dbConnection = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $password);
    $dbConnection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo 'Connection failed: ' . $e->getMessage();
}
?>
