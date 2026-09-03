<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->uuid('public_token')->nullable()->unique()->after('numero');
            });

            DB::table('ordenes_trabajo')
                ->whereNull('public_token')
                ->orderBy('id')
                ->chunkById(100, function ($rows): void {
                    foreach ($rows as $row) {
                        DB::table('ordenes_trabajo')
                            ->where('id', $row->id)
                            ->update(['public_token' => (string) Str::uuid()]);
                    }
                });

            Schema::create('orden_trabajo_fotos', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('orden_trabajo_id')
                    ->constrained('ordenes_trabajo')
                    ->cascadeOnDelete();
                $table->string('path', 500);
                $table->string('nota', 500)->nullable();
                $table->uuid('created_by_id')->nullable();
                $table->timestampsTz();

                $table->index(['orden_trabajo_id', 'created_at']);
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE orden_trabajo_fotos ADD CONSTRAINT orden_trabajo_fotos_created_by_fk FOREIGN KEY (created_by_id) REFERENCES public.users (id) ON DELETE SET NULL');
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            Schema::dropIfExists('orden_trabajo_fotos');
            Schema::table('ordenes_trabajo', function (Blueprint $table): void {
                $table->dropColumn('public_token');
            });
        });
    }
};
