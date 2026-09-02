<?php

/**
 * Utilidades compartidas para generar íconos (favicon + PWA) desde
 * public/logo.png. Equivalente en PHP/GD al patrón usado en VetSaaS
 * (scripts Python + Pillow), para no depender de un intérprete extra.
 */
const BRAND_ICON_ROOT = __DIR__.'/..';
const BRAND_LOGO_SRC = BRAND_ICON_ROOT.'/public/logo.png';

// Fondo cálido claro (brand-50) usado en íconos maskable/apple-touch,
// que no soportan transparencia real y necesitan un fondo sólido.
const BRAND_SURFACE_LIGHT = [255, 247, 237, 255]; // #FFF7ED

function brand_load_logo(): GdImage
{
    $im = imagecreatefrompng(BRAND_LOGO_SRC);
    imagealphablending($im, false);
    imagesavealpha($im, true);

    return $im;
}

/**
 * Recorta el rectángulo transparente sobrante alrededor del contenido
 * opaco del logo, para aprovechar mejor el lienzo en tamaños chicos.
 */
function brand_crop_to_content(GdImage $img): GdImage
{
    $w = imagesx($img);
    $h = imagesy($img);

    $minX = $w;
    $minY = $h;
    $maxX = 0;
    $maxY = 0;

    for ($y = 0; $y < $h; $y++) {
        for ($x = 0; $x < $w; $x++) {
            $alpha = (imagecolorat($img, $x, $y) >> 24) & 0x7F;
            if ($alpha < 120) {
                $minX = min($minX, $x);
                $minY = min($minY, $y);
                $maxX = max($maxX, $x);
                $maxY = max($maxY, $y);
            }
        }
    }

    if ($maxX < $minX || $maxY < $minY) {
        return $img;
    }

    $cw = $maxX - $minX + 1;
    $ch = $maxY - $minY + 1;

    $out = imagecreatetruecolor($cw, $ch);
    imagealphablending($out, false);
    imagesavealpha($out, true);
    imagecopy($out, $img, 0, 0, $minX, $minY, $cw, $ch);

    return $out;
}

/**
 * Reescala manteniendo aspect ratio para que quepa dentro de una caja
 * cuadrada de `$box` px.
 */
function brand_resize_logo(GdImage $content, int $box): GdImage
{
    $cw = imagesx($content);
    $ch = imagesy($content);
    $scale = min($box / $cw, $box / $ch);
    $nw = max(1, (int) round($cw * $scale));
    $nh = max(1, (int) round($ch * $scale));

    $out = imagecreatetruecolor($nw, $nh);
    imagealphablending($out, false);
    imagesavealpha($out, true);
    imagecopyresampled($out, $content, 0, 0, 0, 0, $nw, $nh, $cw, $ch);

    return $out;
}

/**
 * Compone el logo centrado sobre un lienzo cuadrado de `$size`, con
 * fondo opcional (null = transparente) y el logo ocupando `$logoRatio`
 * del lienzo.
 */
function brand_fit_square(GdImage $img, int $size, ?array $background, float $logoRatio): GdImage
{
    $content = brand_crop_to_content($img);
    $inner = max(16, (int) round($size * $logoRatio));
    $resized = brand_resize_logo($content, $inner);

    $canvas = imagecreatetruecolor($size, $size);
    imagealphablending($canvas, false);
    imagesavealpha($canvas, true);

    if ($background === null) {
        $fill = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
    } else {
        [$r, $g, $b] = $background;
        $fill = imagecolorallocate($canvas, $r, $g, $b);
    }
    imagefill($canvas, 0, 0, $fill);

    $ox = (int) round(($size - imagesx($resized)) / 2);
    $oy = (int) round(($size - imagesy($resized)) / 2);
    imagealphablending($canvas, true);
    imagecopy($canvas, $resized, $ox, $oy, 0, 0, imagesx($resized), imagesy($resized));

    return $canvas;
}

/** Lienzo transparente con un círculo blanco centrado (look "any" del ícono PWA). */
function brand_white_circle_canvas(int $size): GdImage
{
    $canvas = imagecreatetruecolor($size, $size);
    imagealphablending($canvas, false);
    imagesavealpha($canvas, true);
    $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
    imagefill($canvas, 0, 0, $transparent);

    $radius = (int) round($size * 0.42);
    $cx = (int) round($size / 2);
    $cy = (int) round($size / 2);

    imagealphablending($canvas, true);
    $white = imagecolorallocate($canvas, 255, 255, 255);
    imagefilledellipse($canvas, $cx, $cy, $radius * 2, $radius * 2, $white);

    return $canvas;
}

/** Ícono "any": círculo blanco + logo al 58% del lienzo (fondo transparente fuera del círculo). */
function brand_compose_any_icon(GdImage $logo, int $size): GdImage
{
    $canvas = brand_white_circle_canvas($size);
    $content = brand_crop_to_content($logo);
    $inner = max(16, (int) round($size * 0.58));
    $resized = brand_resize_logo($content, $inner);

    $ox = (int) round(($size - imagesx($resized)) / 2);
    $oy = (int) round(($size - imagesy($resized)) / 2);
    imagealphablending($canvas, true);
    imagecopy($canvas, $resized, $ox, $oy, 0, 0, imagesx($resized), imagesy($resized));

    return $canvas;
}

/** Ícono "maskable": logo al 68% sobre fondo sólido claro (safe zone Android/iOS). */
function brand_compose_maskable_icon(GdImage $logo, int $size): GdImage
{
    return brand_fit_square($logo, $size, BRAND_SURFACE_LIGHT, 0.68);
}

function brand_save_png(GdImage $im, string $path): void
{
    imagepng($im, $path);
}

/**
 * Construye un .ico multi-tamaño embebiendo PNGs (soportado desde
 * Windows Vista / todos los navegadores modernos).
 */
function brand_write_ico(array $sizedImages, string $path): void
{
    $sizes = array_keys($sizedImages);
    $count = count($sizes);
    $header = pack('vvv', 0, 1, $count);
    $entries = '';
    $dataBlob = '';
    $offset = 6 + ($count * 16);

    foreach ($sizedImages as $size => $im) {
        ob_start();
        imagepng($im);
        $data = ob_get_clean();
        $len = strlen($data);
        $wh = $size >= 256 ? 0 : $size;
        $entries .= pack('CCCCvvVV', $wh, $wh, 0, 0, 1, 32, $len, $offset);
        $dataBlob .= $data;
        $offset += $len;
    }

    file_put_contents($path, $header.$entries.$dataBlob);
}
