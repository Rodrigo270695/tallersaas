<?php

namespace App\Services\Ai;

use RuntimeException;

class OpenAiException extends RuntimeException
{
    public function __construct(string $message, public int $httpStatus = 502)
    {
        parent::__construct($message);
    }
}
