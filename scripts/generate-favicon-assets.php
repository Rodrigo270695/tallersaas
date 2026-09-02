<?php

/**
 * Genera favicon.ico, favicon PNGs, apple-touch-icon e íconos sueltos
 * de raíz (icon-192/512) desde public/logo.png.
 *
 * Uso: php scripts/generate-favicon-assets.php
 */
require __DIR__.'/brand-icon-utils.php';

$public = BRAND_ICON_ROOT.'/public';
$logo = brand_load_logo();

// favicon.ico multi-tamaño (16/32/48), fondo transparente.
$icoImages = [];
foreach ([16, 32, 48] as $size) {
    $icoImages[$size] = brand_fit_square($logo, $size, null, 0.76);
}
brand_write_ico($icoImages, "{$public}/favicon.ico");
echo "  favicon.ico\n";

// PNGs sueltos: favicon 16/32 transparentes, apple-touch-icon + icon-192/512
// con fondo sólido claro (no soportan transparencia real en el launcher).
foreach ([16, 32] as $size) {
    brand_save_png(brand_fit_square($logo, $size, null, 0.76), "{$public}/favicon-{$size}x{$size}.png");
    echo "  favicon-{$size}x{$size}.png\n";
}

brand_save_png(brand_fit_square($logo, 180, BRAND_SURFACE_LIGHT, 0.68), "{$public}/apple-touch-icon.png");
echo "  apple-touch-icon.png\n";

brand_save_png(brand_fit_square($logo, 192, BRAND_SURFACE_LIGHT, 0.68), "{$public}/icon-192.png");
echo "  icon-192.png\n";

brand_save_png(brand_fit_square($logo, 512, BRAND_SURFACE_LIGHT, 0.68), "{$public}/icon-512.png");
echo "  icon-512.png\n";

echo "Favicons generados en public/\n";
