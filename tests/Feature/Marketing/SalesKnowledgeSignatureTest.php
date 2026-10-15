<?php

declare(strict_types=1);

it('rechaza la consulta de conocimiento sin firma o con otro secreto', function (): void {
    config(['orvae.provision.hmac_secret' => 'test-knowledge-secret']);
    $timestamp = (string) time();

    $this->getJson('http://localhost/api/internal/saas/salesbot-knowledge')->assertUnauthorized();

    $this->call('GET', 'http://localhost/api/internal/saas/salesbot-knowledge', server: [
        'HTTP_ACCEPT' => 'application/json',
        'HTTP_X_ORVAE_TIMESTAMP' => $timestamp,
        'HTTP_X_ORVAE_SIGNATURE' => hash_hmac('sha256', $timestamp.'.', 'otro-secreto'),
        'HTTP_X_IDEMPOTENCY_KEY' => 'test:knowledge',
    ])->assertUnauthorized();
});
