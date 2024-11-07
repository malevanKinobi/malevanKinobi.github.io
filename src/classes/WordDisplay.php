<?php

namespace classes;

class WordDisplay {
    private $db;
    private $word;
    private $length;

    public function __construct($db) {
        $this->db = $db;
        $this->word = $this->fetchWordFromDatabase();
        $this->length = mb_strlen($this->word);
    }

    // Метод для получения случайного слова из базы данных
    private function fetchWordFromDatabase() {
        $wordManager = new Word($this->db);
        return $wordManager->getRandomWord();
    }

    // Метод для получения CSS-класса на основе длины слова
    private function getContainerClass() {
        if ($this->length <= 4) {
            return 'small-container';
        } elseif ($this->length <= 7) {
            return 'medium-container';
        } else {
            return 'large-container';
        }
    }

    private function getLetterClass() {
        if ($this->length <= 4) {
            return 'small-letter';
        } elseif ($this->length <= 7) {
            return 'medium-letter';
        } else {
            return 'large-letter';
        }
    }

    // Метод для генерации HTML-кода с нужным количеством звездочек
    public function generateStarsHtml() {
        $containerClass = $this->getContainerClass();
        $letterClass = $this->getLetterClass();
        $html = "<div class='container-for-word $containerClass'><div class='row'>";

        for ($i = 0; $i < $this->length; $i++) {
            $html .= "<div class='letter $letterClass'>*</div>";
        }

        $html .= "</div></div>";
        return $html;
    }
}