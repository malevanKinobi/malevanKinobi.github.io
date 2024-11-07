<?php

namespace classes;

class User {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getUserByChatId($telegram_id) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE telegram_id = ?");
        $stmt->execute([$telegram_id]);
        return $stmt->fetch(\PDO::FETCH_ASSOC);
    }

    public function createUser($telegram_id, $first_name, $last_name, $username) {
        $stmt = $this->db->prepare("INSERT INTO users (telegram_id, full_name, username) VALUES (?, ?, ?)");
        return $stmt->execute([$telegram_id, "$first_name $last_name", $username]);
    }
}
?>
