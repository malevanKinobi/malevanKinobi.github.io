<?php

namespace classes;

class Encryption {
    public static function xorDecrypt($encrypted_text, $key) {
        // Декодируем base64
        $data = base64_decode($encrypted_text);

        // Преобразуем ключ в байты
        $key_bytes = $key;
        $decrypted = '';

        // XOR дешифровка побайтово
        for ($i = 0; $i < strlen($data); $i++) {
            $decrypted .= chr(ord($data[$i]) ^ ord($key_bytes[$i % strlen($key_bytes)]));
        }

        // Преобразуем результат в UTF-8 для корректного отображения кириллицы
        return mb_convert_encoding($decrypted, 'UTF-8', 'UTF-8');
    }
}