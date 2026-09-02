<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tablas de Spatie Permission con Teams activo (`tenant_id` UUID).
     *
     * `roles.id` / `permissions.id` se quedan como bigint autoincrement
     * (son catálogos internos, no se exponen ni se referencian desde el
     * front); `model_id` (usuario) sí es UUID porque `users.id` lo es.
     * Un rol con `tenant_id = null` es de plataforma (superadmin); con
     * `tenant_id = <uuid>` pertenece solo a ese taller.
     */
    public function up(): void
    {
        $teams = config('permission.teams');
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $pivotRole = $columnNames['role_pivot_key'] ?? 'role_id';
        $pivotPermission = $columnNames['permission_pivot_key'] ?? 'permission_id';
        $teamKey = $columnNames['team_foreign_key'] ?? 'tenant_id';

        throw_if(empty($tableNames), 'Error: config/permission.php not loaded. Run [php artisan config:clear] and try again.');
        throw_if($teams && empty($teamKey), 'Error: team_foreign_key on config/permission.php not loaded. Run [php artisan config:clear] and try again.');

        Schema::create($tableNames['permissions'], static function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('guard_name');
            $table->string('description')->nullable();
            $table->timestamps();

            $table->unique(['name', 'guard_name']);
        });

        Schema::create($tableNames['roles'], static function (Blueprint $table) use ($teams, $teamKey) {
            $table->id();
            if ($teams) {
                $table->uuid($teamKey)->nullable();
                $table->index($teamKey, 'roles_tenant_id_index');
            }
            $table->string('name');
            $table->string('guard_name');
            $table->string('description')->nullable();
            $table->timestamps();

            if ($teams) {
                $table->unique([$teamKey, 'name', 'guard_name'], 'roles_tenant_name_guard_unique');
            } else {
                $table->unique(['name', 'guard_name']);
            }
        });

        // NOTA IMPORTANTE sobre `tenant_id` en las tablas pivote:
        //
        // A diferencia de `roles.tenant_id` (que SÍ es parte de la unicidad
        // del rol: "admin_taller" de tenant A es una fila distinta a
        // "admin_taller" de tenant B), en `model_has_permissions` y
        // `model_has_roles` el `tenant_id` NO se incluye en la clave
        // primaria. Motivo: en PostgreSQL una columna que forma parte de
        // la PK se vuelve `NOT NULL` automáticamente, y el rol
        // `superadmin` (plataforma, sin tenant) necesita asignarse con
        // `tenant_id = null`. Como `role_id`/`permission_id` YA identifica
        // unívocamente al tenant (vía `roles.tenant_id`), no hace falta
        // repetirlo en la PK: `tenant_id` aquí es solo una columna
        // denormalizada nullable + indexada que Spatie usa para acotar
        // las consultas por equipo (mismo patrón que VetSaaS).
        Schema::create($tableNames['model_has_permissions'], static function (Blueprint $table) use ($tableNames, $columnNames, $pivotPermission, $teams, $teamKey) {
            $table->unsignedBigInteger($pivotPermission);

            $table->string('model_type');
            $table->uuid($columnNames['model_morph_key']);
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_permissions_model_id_model_type_index');

            $table->foreign($pivotPermission)
                ->references('id')
                ->on($tableNames['permissions'])
                ->cascadeOnDelete();

            if ($teams) {
                $table->uuid($teamKey)->nullable();
                $table->index($teamKey, 'model_has_permissions_tenant_id_index');
            }

            $table->primary(
                [$pivotPermission, $columnNames['model_morph_key'], 'model_type'],
                'model_has_permissions_permission_model_type_primary'
            );
        });

        Schema::create($tableNames['model_has_roles'], static function (Blueprint $table) use ($tableNames, $columnNames, $pivotRole, $teams, $teamKey) {
            $table->unsignedBigInteger($pivotRole);

            $table->string('model_type');
            $table->uuid($columnNames['model_morph_key']);
            $table->index([$columnNames['model_morph_key'], 'model_type'], 'model_has_roles_model_id_model_type_index');

            $table->foreign($pivotRole)
                ->references('id')
                ->on($tableNames['roles'])
                ->cascadeOnDelete();

            if ($teams) {
                $table->uuid($teamKey)->nullable();
                $table->index($teamKey, 'model_has_roles_tenant_id_index');
            }

            $table->primary(
                [$pivotRole, $columnNames['model_morph_key'], 'model_type'],
                'model_has_roles_role_model_type_primary'
            );
        });

        Schema::create($tableNames['role_has_permissions'], static function (Blueprint $table) use ($tableNames, $pivotRole, $pivotPermission) {
            $table->unsignedBigInteger($pivotPermission);
            $table->unsignedBigInteger($pivotRole);

            $table->foreign($pivotPermission)
                ->references('id')
                ->on($tableNames['permissions'])
                ->cascadeOnDelete();

            $table->foreign($pivotRole)
                ->references('id')
                ->on($tableNames['roles'])
                ->cascadeOnDelete();

            $table->primary([$pivotPermission, $pivotRole], 'role_has_permissions_permission_id_role_id_primary');
        });

        app('cache')
            ->store(config('permission.cache.store') != 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    public function down(): void
    {
        $tableNames = config('permission.table_names');

        throw_if(empty($tableNames), 'Error: config/permission.php not found and defaults could not be merged. Please publish the package configuration before proceeding, or drop the tables manually.');

        Schema::dropIfExists($tableNames['role_has_permissions']);
        Schema::dropIfExists($tableNames['model_has_roles']);
        Schema::dropIfExists($tableNames['model_has_permissions']);
        Schema::dropIfExists($tableNames['roles']);
        Schema::dropIfExists($tableNames['permissions']);
    }
};
