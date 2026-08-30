export type RolUsuario = 
  | 'administrador' 
  | 'propietario_empresa' 
  | 'analista' 
  | 'usuario_operativo';

export type EstadoUsuario = 'activo' | 'inactivo' | 'suspendido';

export type RubroProyecto = 
  | 'ventas' 
  | 'comercio' 
  | 'demografia' 
  | 'poblacion' 
  | 'territorial' 
  | 'inventario' 
  | 'otros';

export type EstadoProyecto = 
  | 'creado' 
  | 'con_datasets' 
  | 'en_mapeo' 
  | 'en_limpieza' 
  | 'procesado' 
  | 'archivado';

export type EstadoDataset = 
  | 'cargado' 
  | 'analizado' 
  | 'mapeado' 
  | 'procesando' 
  | 'procesado' 
  | 'error';

export type EstadoOportunidad = 
  | 'detectada' 
  | 'en_revision' 
  | 'aprobada' 
  | 'rechazada' 
  | 'implementada';

export type PermisoAccion = 
  | 'ver_datos'
  | 'analizar_datos'
  | 'subir_datasets'
  | 'limpiar_datos'
  | 'procesar_datasets'
  | 'crear_oportunidades'
  | 'proponer_cambios'
  | 'aprobar_cambios'
  | 'modificar_ofertas'
  | 'modificar_campanas'
  | 'administrar_usuarios';

export interface Usuario {
  id: string;
  empresa_id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  permisos?: PermisoAccion[];
  ultimo_acceso?: string;
  creado_en: string;
  actualizado_en: string;
}

export interface Empresa {
  id: string;
  nombre: string;
  ruc_identificador?: string;
  descripcion?: string;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface Proyecto {
  id: string;
  usuario_propietario_id: string;
  empresa_id: string;
  nombre: string;
  rubro: RubroProyecto;
  descripcion?: string;
  estado: EstadoProyecto;
  creado_en: string;
  actualizado_en: string;
}

export interface ColumnaDetectada {
  nombre: string;
  tipo: 'texto' | 'entero' | 'decimal' | 'fecha' | 'booleano' | 'coordenada' | 'categoria';
  total_nulos: number;
  porcentaje_nulos: number;
  total_unicos: number;
  ejemplos: any[];
  min?: number | string;
  max?: number | string;
  promedio?: number;
}

export interface CalidadMetadatos {
  puntuacion_calidad: number;
  total_filas: number;
  total_columnas: number;
  celdas_vacias: number;
  duplicados_detectados: number;
  tiene_coordenadas: boolean;
  tiene_fechas: boolean;
  tiene_montos: boolean;
}

export interface Dataset {
  id: string;
  proyecto_id: string;
  nombre_original: string;
  nombre_almacenamiento: string;
  ruta_archivo: string;
  formato: 'csv' | 'xlsx';
  tamano: number;
  total_filas: number;
  columnas_detectadas: ColumnaDetectada[];
  calidad_metadatos: CalidadMetadatos;
  estado: EstadoDataset;
  subido_por: string;
  subido_en: string;
  actualizado_en: string;
}

export interface MapeoColumna {
  id: string;
  dataset_id: string;
  columna_origen: string;
  columna_canonica: string;
  tipo_destino: string;
  confianza: number;
  creado_en: string;
}

export interface SugerenciaMapeo {
  columna_origen: string;
  columna_canonica_sugerida: string;
  confianza: number;
  razon: string;
  ejemplos_valores: any[];
}

export type TipoTransformacion =
  | 'eliminar_nulos'
  | 'rellenar_nulos'
  | 'eliminar_duplicados'
  | 'convertir_tipo'
  | 'normalizar_fechas'
  | 'renombrar_columna'
  | 'eliminar_columna'
  | 'estandarizar_texto'
  | 'limpiar_espacios'
  | 'limpiar_caracteres_especiales'
  | 'filtrar_rango';

export interface TransformacionDataset {
  id: string;
  dataset_id: string;
  tipo_transformacion: TipoTransformacion;
  columna?: string;
  configuracion: Record<string, any>;
  filas_afectadas: number;
  filas_antes: number;
  filas_despues: number;
  ejecutado_por: string;
  ejecutado_en: string;
}

export interface DatasetFusionado {
  id: string;
  proyecto_id: string;
  ruta_parquet: string;
  total_filas_consolidadas: number;
  tamano_mb: number;
  version: number;
  esquema_consolidado: {
    nombre: string;
    tipo: string;
    origenes: { dataset_id: string; columna_origen: string }[];
  }[];
  datasets_fuente: {
    id: string;
    nombre: string;
    filas_aportadas: number;
  }[];
  resumen_calidad: Record<string, any>;
  fusionado_por: string;
  fusionado_en: string;
}

export interface Oportunidad {
  id: string;
  proyecto_id: string;
  titulo: string;
  descripcion: string;
  evidencia: string;
  metrica_detectada?: string;
  impacto_estimado?: string;
  estado: EstadoOportunidad;
  creado_por: string;
  creado_por_nombre?: string;
  revisado_por?: string;
  aprobado_por?: string;
  implementado_por?: string;
  notas_revision?: string;
  creado_en: string;
  actualizado_en: string;
}

export interface ModuloOperativo {
  id: string;
  empresa_id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  descripcion?: string;
  configuracion?: Record<string, any>;
  creado_en: string;
}

export interface SubmoduloOperativo {
  id: string;
  modulo_id: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
  configuracion?: Record<string, any>;
  creado_en: string;
}

export interface CampoDinamico {
  id: string;
  submodulo_id: string;
  nombre: string;
  etiqueta: string;
  tipo: 'texto' | 'numero' | 'moneda' | 'fecha' | 'select' | 'booleano';
  requerido: boolean;
  opciones?: string[];
  configuracion?: Record<string, any>;
  orden: number;
}

export interface RegistroOperativo {
  id: string;
  submodulo_id: string;
  datos: Record<string, any>;
  creado_por: string;
  actualizado_por?: string;
  creado_en: string;
  actualizado_en: string;
}

export interface AuditoriaLog {
  id: string;
  empresa_id?: string;
  proyecto_id?: string;
  usuario_id?: string;
  usuario_nombre?: string;
  accion: string;
  entidad: string;
  entidad_id?: string;
  detalles: Record<string, any>;
  ip_origen?: string;
  creado_en: string;
}

export interface FlowStatus {
  projectId: string;
  rubro: RubroProyecto;
  hasDatasets: boolean;
  hasMappings: boolean;
  isProcessed: boolean;
  unlockedModules: {
    datasets: boolean;
    exploration: boolean;
    mapping: boolean;
    cleaning: boolean;
    fusion: boolean;
    dashboard: boolean;
    opportunities: boolean;
    operational_modules: boolean;
    team: boolean;
    reports: boolean;
  };
  missingRequirements: {
    exploration: string | null;
    mapping: string | null;
    cleaning: string | null;
    fusion: string | null;
    dashboard: string | null;
    reports: string | null;
  };
}

export type TabKey =
  | 'inicio'
  | 'proyectos'
  | 'datasets'
  | 'mapeo'
  | 'limpieza'
  | 'fusion'
  | 'dashboard'
  | 'oportunidades'
  | 'modulos_operativos'
  | 'usuarios'
  | 'auditoria'
  | 'reporte_pdf';
