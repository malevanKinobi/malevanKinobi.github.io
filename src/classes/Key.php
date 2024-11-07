<?php

namespace classes;


class Key {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Метод для получения текущего ключа из БД
    public function getEncryptionKey() {
        $stmt = $this->db->prepare("SELECT `encryption_key` FROM `keys` ORDER BY created_at DESC LIMIT 1");
        $stmt->execute();
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $result ? $result['encryption_key'] : null;
    }
}