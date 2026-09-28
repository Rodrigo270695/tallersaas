<?php

use App\Http\Middleware\ExternalTenantVisit;
use Illuminate\Foundation\Http\Kernel;
use Illuminate\Session\Middleware\StartSession;

it('abre la visita externa con otra cookie de sesion, solo de ese host', function () {
    $kernel = app(Kernel::class);
    $priority = (new ReflectionClass($kernel))->getProperty('middlewarePriority');
    $priority->setAccessible(true);
    $order = $priority->getValue($kernel);

    $visit = array_search(ExternalTenantVisit::class, $order, true);
    $session = array_search(StartSession::class, $order, true);

    expect($visit)->toBeInt()->toBeLessThan($session);

    $response = $this->get('/?visita=externa');

    $cookies = collect($response->headers->getCookies());
    $marker = $cookies->first(fn ($cookie) => $cookie->getName() === ExternalTenantVisit::MARKER);

    expect($cookies->contains(fn ($cookie) => $cookie->getName() === ExternalTenantVisit::SESSION_COOKIE))->toBeTrue()
        ->and($marker)->not->toBeNull()
        ->and($marker->getDomain())->toBeNull();

    $follow = $this->withUnencryptedCookie(ExternalTenantVisit::MARKER, $marker->getValue())->get('/');
    $followNames = collect($follow->headers->getCookies())->map->getName();

    expect($followNames)->toContain(ExternalTenantVisit::SESSION_COOKIE)
        ->and($followNames)->not->toContain(ExternalTenantVisit::MARKER);
});

it('no cambia la sesion del panel si la visita no es externa', function () {
    $response = $this->get('/');

    $names = collect($response->headers->getCookies())->map->getName();

    expect($names)->not->toContain(ExternalTenantVisit::SESSION_COOKIE)
        ->and($names)->not->toContain(ExternalTenantVisit::MARKER);
});
