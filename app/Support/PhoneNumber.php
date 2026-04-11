<?php

namespace App\Support;

class PhoneNumber
{
    public static function normalize(?string $raw): string
    {
        if ($raw === null || $raw === '') {
            return '';
        }

        return preg_replace('/\D+/', '', $raw);
    }
}

