-- ==============================================================================
-- CRM DEXTER - ESQUEMA DE BASE DE DATOS POSTGRESQL (PRODUCCIÓN)
-- Arquitectura de Metadatos, Seguridad, Auditoría y Procesamiento Analítico
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS
CREATE TYPE rol_usuario AS ENUM (
    'administrador',
    'propietario_empresa',
    'analista',
    'usuario_operativo'
);

CREATE TYPE estado_usuario AS ENUM (
    'activo',
    'inactivo',
    'suspendido'
);

CREATE TYPE rubro_proyecto AS ENUM (
    'ventas',
    'comercio',
    'demografia',
    'poblacion',
    'territorial',
    'inventario',
    'otros'
);

CREATE TYPE estado_proyecto AS ENUM (
    'creado',
    'con_datasets',
    'en_mapeo',
    'en_limpieza',
    'procesado',
    'archivado'
);

CREATE TYPE estado_dataset AS ENUM (
    'cargado',
    'analizado',
    'mapeado',
    'procesando',
    'procesado',
    'error'
);

CREATE TYPE estado_oportunidad AS ENUM (
    'detectada',
    'en_revision',
    'aprobada',
    'rechazada',
    'implementada'
);

-- 3. TABLA: EMPRESAS (Multi-tenancy)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    ruc_identificador VARCHAR(50),
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA: USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'analista',
    estado estado_usuario NOT NULL DEFAULT 'activo',
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);

-- 5. TABLA: PERMISOS DE USUARIO POR PROYECTO / EMPRESA
CREATE TABLE IF NOT EXISTS permisos_usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    permiso VARCHAR(80) NOT NULL, -- 'ver_datos', 'analizar_datos', 'subir_datasets', 'procesar_datasets', 'crear_oportunidades', 'proponer_cambios', 'aprobar_cambios', 'modificar_ofertas', 'modificar_campanas', 'administrar_usuarios'
    concedido_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, empresa_id, permiso)
);

-- 6. TABLA: PROYECTOS
CREATE TABLE IF NOT EXISTS proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    rubro rubro_proyecto NOT NULL DEFAULT 'ventas',
    descripcion TEXT,
    estado estado_proyecto NOT NULL DEFAULT 'creado',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proyectos_empresa ON proyectos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_propietario ON proyectos(usuario_propietario_id);

-- 7. TABLA: PROYECTO_USUARIOS_ASIGNADOS
CREATE TABLE IF NOT EXISTS proyectos_usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    puede_editar BOOLEAN DEFAULT TRUE,
    asignado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proyecto_id, usuario_id)
);

-- 8. TABLA: DATASETS (Metadatos de archivos crudos almacenados en storage/raw/)
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_almacenamiento VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    formato VARCHAR(10) NOT NULL, -- 'csv', 'xlsx'
    tamano BIGINT NOT NULL,
    total_filas INTEGER NOT NULL DEFAULT 0,
    columnas_detectadas JSONB NOT NULL DEFAULT '[]'::jsonb,
    calidad_metadatos JSONB NOT NULL DEFAULT '{}'::jsonb,
    estado estado_dataset NOT NULL DEFAULT 'cargado',
    subido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    subido_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_datasets_proyecto ON datasets(proyecto_id);

-- 9. TABLA: MAPEOS_COLUMNAS
CREATE TABLE IF NOT EXISTS mapeos_columnas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    columna_origen VARCHAR(120) NOT NULL,
    columna_canonica VARCHAR(120) NOT NULL,
    tipo_destino VARCHAR(50) NOT NULL DEFAULT 'texto',
    confianza NUMERIC(5,2) DEFAULT 1.00,
    mapeado_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dataset_id, columna_origen)
);

CREATE INDEX IF NOT EXISTS idx_mapeos_dataset ON mapeos_columnas(dataset_id);

-- 10. TABLA: TRANSFORMACIONES_DATASETS (Historial de Limpieza)
CREATE TABLE IF NOT EXISTS transformaciones_datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    tipo_transformacion VARCHAR(80) NOT NULL,
    columna VARCHAR(120),
    configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
    filas_afectadas INTEGER DEFAULT 0,
    filas_antes INTEGER DEFAULT 0,
    filas_despues INTEGER DEFAULT 0,
    ejecutado_por UUID REFERENCES usuarios(id),
    ejecutado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transformaciones_dataset ON transformaciones_datasets(dataset_id);

-- 11. TABLA: DATASETS_FUSIONADOS (Archivo Maestro storage/processed/*.parquet)
CREATE TABLE IF NOT EXISTS datasets_fusionados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    ruta_parquet VARCHAR(500) NOT NULL,
    total_filas_consolidadas INTEGER NOT NULL DEFAULT 0,
    tamano_mb NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    version INTEGER NOT NULL DEFAULT 1,
    esquema_consolidado JSONB NOT NULL DEFAULT '[]'::jsonb,
    datasets_fuente JSONB NOT NULL DEFAULT '[]'::jsonb,
    resumen_calidad JSONB NOT NULL DEFAULT '{}'::jsonb,
    fusionado_por UUID REFERENCES usuarios(id),
    fusionado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_datasets_fusionados_proyecto ON datasets_fusionados(proyecto_id);

-- 12. TABLA: OPORTUNIDADES DE NEGOCIO
CREATE TABLE IF NOT EXISTS oportunidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    evidencia TEXT NOT NULL,
    metrica_detectada VARCHAR(120),
    impacto_estimado VARCHAR(150),
    estado estado_oportunidad NOT NULL DEFAULT 'detectada',
    creado_por UUID NOT NULL REFERENCES usuarios(id),
    revisado_por UUID REFERENCES usuarios(id),
    aprobado_por UUID REFERENCES usuarios(id),
    implementado_por UUID REFERENCES usuarios(id),
    notas_revision TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oportunidades_proyecto ON oportunidades(proyecto_id);

-- 13. MÓDULOS OPERATIVOS ADAPTATIVOS (Estructuras Flexibles sin SQL Arbitrario)
CREATE TABLE IF NOT EXISTS modulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'operativo',
    descripcion TEXT,
    configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submodulos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modulo_id UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campos_dinamicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submodulo_id UUID NOT NULL REFERENCES submodulos(id) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL,
    etiqueta VARCHAR(120) NOT NULL,
    tipo VARCHAR(40) NOT NULL, -- 'texto', 'numero', 'moneda', 'fecha', 'select', 'booleano'
    requerido BOOLEAN DEFAULT FALSE,
    opciones JSONB DEFAULT '[]'::jsonb,
    configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
    orden INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registros_operativos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submodulo_id UUID NOT NULL REFERENCES submodulos(id) ON DELETE CASCADE,
    datos JSONB NOT NULL DEFAULT '{}'::jsonb,
    creado_por UUID REFERENCES usuarios(id),
    actualizado_por UUID REFERENCES usuarios(id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. TABLA: AUDITORÍA DE CAMBIOS (Audit Log)
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(80) NOT NULL,
    entidad_id VARCHAR(100),
    detalles JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_origen VARCHAR(45),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON auditoria_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_proyecto ON auditoria_logs(proyecto_id);
