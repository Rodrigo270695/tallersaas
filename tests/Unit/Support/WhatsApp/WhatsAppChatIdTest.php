<?php

declare(strict_types=1);

use App\Support\WhatsApp\WhatsAppChatId;

it('antepone 51 a un celular peruano de 9 dígitos', function (): void {
    expect(WhatsAppChatId::digits('987 654 321'))->toBe('51987654321')
        ->and(WhatsAppChatId::fromPhone('987654321'))->toBe('51987654321@c.us');
});

it('acepta el número ya con código de país', function (): void {
    expect(WhatsAppChatId::digits('+51 987654321'))->toBe('51987654321');
});

it('rechaza teléfonos demasiado cortos o vacíos', function (): void {
    expect(WhatsAppChatId::digits(null))->toBeNull()
        ->and(WhatsAppChatId::digits(''))->toBeNull()
        ->and(WhatsAppChatId::digits('123'))->toBeNull();
});

it('arma la url de wa.me con el texto codificado', function (): void {
    expect(WhatsAppChatId::waMeUrl('51987654321', "Hola\nlisto"))
        ->toBe('https://wa.me/51987654321?text=Hola%0Alisto');
});
