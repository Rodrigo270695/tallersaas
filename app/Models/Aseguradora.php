<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Aseguradora extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'aseguradoras';

    protected $fillable = [
        'nombre',
        'ruc',
        'telefono',
        'email',
        'activo',
        'created_by_id',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function siniestros(): HasMany
    {
        return $this->hasMany(Siniestro::class);
    }
}
