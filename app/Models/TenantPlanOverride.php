<?php

namespace App\Models;

use App\Models\Concerns\UsesPublicSchema;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantPlanOverride extends Model
{
    use HasUuids, UsesPublicSchema;

    protected $table = 'tenant_plan_overrides';

    protected $fillable = [
        'tenant_id',
        'feature',
        'extra',
        'override',
        'motivo',
        'expires_at',
        'created_by_id',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
