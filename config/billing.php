<?php

return [

    /*
    | Días de gracia tras el vencimiento del período/cobro durante los
    | cuales el tenant conserva acceso (para poder pagar sin perder datos).
    */
    'grace_days' => (int) env('BILLING_GRACE_DAYS', 3),

];
