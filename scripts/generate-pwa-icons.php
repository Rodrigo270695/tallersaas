<?php

/**
 * Genera los íconos PWA (variantes "any" y "maskable") desde
 * public/logo.png hacia public/icons/pwa/.
 *
 * Uso: php scripts/generate-pwa-icons.php
 */
require __DIR__.'/brand-icon-utils.php';

$sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
$outDir = BRAND_ICON_ROOT.'/public/icons/pwa';

if (! is_dir($outDir)) {
    mkdir($outDir, 0755, true);
}

$logo = brand_load_logo();

foreach ($sizes as $size) {
    brand_save_png(brand_compose_any_icon($logo, $size), "{$outDir}/icon-{$size}.png");
    brand_save_png(brand_compose_maskable_icon($logo, $size), "{$outDir}/icon-maskable-{$size}.png");
    echo "OK icon-{$size}.png + maskable\n";
}

echo "Iconos PWA generados en public/icons/pwa/\n";
