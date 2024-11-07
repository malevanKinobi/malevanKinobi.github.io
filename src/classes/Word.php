<?php

namespace classes;

class Word {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    // Метод для получения случайного слова из таблицы words
    public function getRandomWord() {
        $stmt = $this->db->prepare("SELECT word FROM words LIMIT 1");
        $stmt->execute();
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $result ? $result['word'] : '';
    }
}