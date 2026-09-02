<?php

use App\Database\Migrations\TenantMigration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends TenantMigration
{
    public function up(): void
    {
        $this->runInTenant(function (): void {
            Schema::create('fel_series', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('sede_id');
                $table->unsignedTinyInteger('tipo_comprobante');
                $table->string('serie', 4);
                $table->unsignedBigInteger('ultimo_correlativo')->default(0);
                $table->boolean('activo')->default(true);
                $table->timestampsTz();

                $table->unique(['sede_id', 'tipo_comprobante', 'serie']);
                $table->index(['sede_id', 'tipo_comprobante', 'activo']);
            });

            Schema::create('fel_documents', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->foreignUuid('venta_id')->unique()->constrained('ventas')->cascadeOnDelete();
                $table->foreignUuid('fel_serie_id')->constrained('fel_series')->restrictOnDelete();
                $table->unsignedTinyInteger('tipo_comprobante');
                $table->string('serie', 4);
                $table->unsignedBigInteger('correlativo');
                $table->string('numero_completo', 20);
                $table->unsignedTinyInteger('receptor_tipo_doc');
                $table->string('receptor_num_doc', 15);
                $table->string('receptor_nombre', 200);
                $table->decimal('subtotal', 14, 2);
                $table->decimal('igv_monto', 14, 2);
                $table->decimal('total', 14, 2);
                $table->char('moneda', 3)->default('PEN');
                $table->string('estado', 24)->default('pendiente');
                $table->string('nubefact_id', 100)->nullable();
                $table->string('url_pdf', 500)->nullable();
                $table->string('url_xml', 500)->nullable();
                $table->string('url_cdr', 500)->nullable();
                $table->string('enlace_consulta', 500)->nullable();
                $table->json('apisunat_payload')->nullable();
                $table->string('apisunat_mode', 20)->nullable();
                $table->text('error_mensaje')->nullable();
                $table->timestampTz('emitido_at')->nullable();
                $table->timestampsTz();

                $table->index('estado');
                $table->index('numero_completo');
            });

            Schema::table('ventas', function (Blueprint $table): void {
                $table->foreignUuid('fel_document_id')->nullable()->after('created_by_id');
                $table->string('fel_estado', 24)->nullable()->after('fel_document_id');
                $table->unsignedTinyInteger('tipo_comprobante_sunat')->nullable()->after('fel_estado');
            });

            Schema::table('cfg_taller_settings', function (Blueprint $table): void {
                $table->boolean('emite_comprobantes_sunat')->default(false);
                $table->text('apisunat_token_enc')->nullable();
                $table->string('apisunat_mode', 20)->default('sandbox');
                $table->boolean('apisunat_configurado')->default(false);
            });

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('ALTER TABLE fel_series ADD CONSTRAINT fel_series_sede_fk FOREIGN KEY (sede_id) REFERENCES public.sedes (id) ON DELETE RESTRICT');
                DB::statement('ALTER TABLE fel_series ADD CONSTRAINT chk_fel_series_tipo CHECK (tipo_comprobante IN (1, 2))');
                DB::statement("ALTER TABLE fel_documents ADD CONSTRAINT chk_fel_documents_estado CHECK (estado IN ('pendiente', 'emitido', 'rechazado', 'anulado'))");
                DB::statement('ALTER TABLE ventas ADD CONSTRAINT ventas_fel_document_fk FOREIGN KEY (fel_document_id) REFERENCES fel_documents (id) ON DELETE SET NULL');
                DB::statement("ALTER TABLE ventas ADD CONSTRAINT chk_ventas_fel_estado CHECK (fel_estado IS NULL OR fel_estado IN ('pendiente', 'emitido', 'rechazado'))");
                DB::statement("ALTER TABLE cfg_taller_settings ADD CONSTRAINT chk_cfg_apisunat_mode CHECK (apisunat_mode IN ('sandbox', 'produccion'))");
            }
        });
    }

    public function down(): void
    {
        $this->runInTenant(function (): void {
            if (Schema::hasColumn('ventas', 'fel_document_id')) {
                Schema::table('ventas', function (Blueprint $table): void {
                    $table->dropColumn(['fel_document_id', 'fel_estado', 'tipo_comprobante_sunat']);
                });
            }

            Schema::dropIfExists('fel_documents');
            Schema::dropIfExists('fel_series');

            if (Schema::hasColumn('cfg_taller_settings', 'emite_comprobantes_sunat')) {
                Schema::table('cfg_taller_settings', function (Blueprint $table): void {
                    $table->dropColumn([
                        'emite_comprobantes_sunat',
                        'apisunat_token_enc',
                        'apisunat_mode',
                        'apisunat_configurado',
                    ]);
                });
            }
        });
    }
};
