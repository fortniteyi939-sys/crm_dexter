import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  Usuario,
  Empresa,
  Proyecto,
  Dataset,
  MapeoColumna,
  TransformacionDataset,
  DatasetFusionado,
  Oportunidad,
  ModuloOperativo,
  SubmoduloOperativo,
  CampoDinamico,
  RegistroOperativo,
  AuditoriaLog,
  PermisoAccion
} from '../types.ts';
import { storageService } from '../storage/storage.service.ts';

interface DBState {
  empresas: Empresa[];
  usuarios: Usuario[];
  permisos: { usuario_id: string; empresa_id: string; permiso: PermisoAccion }[];
  proyectos: Proyecto[];
  proyectos_usuarios: { proyecto_id: string; usuario_id: string; puede_editar: boolean }[];
  datasets: Dataset[];
  mapeos: MapeoColumna[];
  transformaciones: TransformacionDataset[];
  datasets_fusionados: DatasetFusionado[];
  oportunidades: Oportunidad[];
  modulos: ModuloOperativo[];
  submodulos: SubmoduloOperativo[];
  campos_dinamicos: CampoDinamico[];
  registros_operativos: RegistroOperativo[];
  auditoria_logs: AuditoriaLog[];
}

export class DBRepository {
  private dbPath: string;
  private state: DBState;

  constructor() {
    this.dbPath = path.resolve(process.cwd(), 'storage', 'db_state.json');
    this.state = this.loadState();
    if (this.state.usuarios.length === 0) {
      this.seedInitialData();
    }
  }

  private loadState(): DBState {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Error reading db_state.json, creating clean state', err);
    }

    return {
      empresas: [],
      usuarios: [],
      permisos: [],
      proyectos: [],
      proyectos_usuarios: [],
      datasets: [],
      mapeos: [],
      transformaciones: [],
      datasets_fusionados: [],
      oportunidades: [],
      modulos: [],
      submodulos: [],
      campos_dinamicos: [],
      registros_operativos: [],
      auditoria_logs: []
    };
  }

  private saveState() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db_state.json', err);
    }
  }

  // --- SEED INITIAL DATA ---
  private seedInitialData() {
    const salt = bcrypt.genSaltSync(10);
    const passAdmin = bcrypt.hashSync('DexterAdmin2026!', salt);
    const passProp = bcrypt.hashSync('Propietario2026!', salt);
    const passAnalyst = bcrypt.hashSync('Analista2026!', salt);
    const passOp = bcrypt.hashSync('Operativo2026!', salt);

    const now = new Date().toISOString();

    const empId = 'emp_dexter_01';
    const empresa: Empresa = {
      id: empId,
      nombre: 'Corporación Dexter Analytics S.A.C.',
      ruc_identificador: '20608945123',
      descripcion: 'Organización central de gestión y analítica de datos',
      activo: true,
      creado_en: now,
      actualizado_en: now
    };

    const adminUser: Usuario = {
      id: 'usr_admin_01',
      empresa_id: empId,
      nombre: 'Administrador Master',
      email: 'admin@crmdexter.com',
      password_hash: passAdmin,
      rol: 'administrador',
      estado: 'activo',
      creado_en: now,
      actualizado_en: now
    };

    const propUser: Usuario = {
      id: 'usr_prop_01',
      empresa_id: empId,
      nombre: 'Carlos Mendoza (Propietario)',
      email: 'propietario@dexter.com',
      password_hash: passProp,
      rol: 'propietario_empresa',
      estado: 'activo',
      creado_en: now,
      actualizado_en: now
    };

    const analystUser: Usuario = {
      id: 'usr_analyst_01',
      empresa_id: empId,
      nombre: 'Elena Rostova (Analista Sr)',
      email: 'analista@dexter.com',
      password_hash: passAnalyst,
      rol: 'analista',
      estado: 'activo',
      creado_en: now,
      actualizado_en: now
    };

    const opUser: Usuario = {
      id: 'usr_op_01',
      empresa_id: empId,
      nombre: 'Marcos Ruiz (Operador)',
      email: 'operativo@dexter.com',
      password_hash: passOp,
      rol: 'usuario_operativo',
      estado: 'activo',
      creado_en: now,
      actualizado_en: now
    };

    this.state.empresas.push(empresa);
    this.state.usuarios.push(adminUser, propUser, analystUser, opUser);

    // Default permissions for analyst
    const analystPerms: PermisoAccion[] = [
      'ver_datos',
      'analizar_datos',
      'subir_datasets',
      'limpiar_datos',
      'procesar_datasets',
      'crear_oportunidades',
      'proponer_cambios'
    ];

    analystPerms.forEach(p => {
      this.state.permisos.push({
        usuario_id: analystUser.id,
        empresa_id: empId,
        permiso: p
      });
    });

    // Sample Project 1: Ventas Retail
    const projVentasId = 'proj_ventas_01';
    const projVentas: Proyecto = {
      id: projVentasId,
      usuario_propietario_id: propUser.id,
      empresa_id: empId,
      nombre: 'Ventas Retail Multicanal & Black Friday 2026',
      rubro: 'ventas',
      descripcion: 'Consolidación de transacciones de tiendas físicas y ecommerce para detección de impacto de promociones.',
      estado: 'procesado',
      creado_en: now,
      actualizado_en: now
    };

    // Sample Project 2: Demografía Perú
    const projDemoId = 'proj_demo_02';
    const projDemo: Proyecto = {
      id: projDemoId,
      usuario_propietario_id: propUser.id,
      empresa_id: empId,
      nombre: 'Censo Territorial y Densidad Poblacional',
      rubro: 'demografia',
      descripcion: 'Monitoreo demográfico regional e índices de concentración poblacional con mapas de calor.',
      estado: 'procesado',
      creado_en: now,
      actualizado_en: now
    };

    this.state.proyectos.push(projVentas, projDemo);
    this.state.proyectos_usuarios.push(
      { proyecto_id: projVentasId, usuario_id: analystUser.id, puede_editar: true },
      { proyecto_id: projDemoId, usuario_id: analystUser.id, puede_editar: true }
    );

    // Seed Raw Files and Datasets for Ventas
    const sampleVentasCSV = `fecha,total_soles,cantidad_vendida,nombre_producto,linea,sucursal,evento,cliente\n` +
      `2026-01-15,1850.00,2,Laptop Pro 15",Tecnología,Sede Central Lima,Campaña Verano,Juan Pérez\n` +
      `2026-01-18,240.50,5,Mouse Ergonómico,Accesorios,Online Ecommerce,Regular,María Gómez\n` +
      `2026-02-05,3200.00,1,Monitor 4K Curved,Tecnología,Sede Central Lima,Regular,Tech Corp SAC\n` +
      `2026-02-14,450.00,3,Teclado Mecánico RGB,Accesorios,Tienda Arequipa,San Valentín,Carlos Ruiz\n` +
      `2026-03-01,9800.00,4,Servidor NAS 4-Bay,Infraestructura,Online Ecommerce,Empresarial,Innova Perú\n` +
      `2026-03-15,2200.00,2,Laptop Pro 15",Tecnología,Tienda Trujillo,Black Friday Anticipado,Lucía Castro\n` +
      `2026-04-10,3400.00,2,Monitor 4K Curved,Tecnología,Online Ecommerce,Black Friday Anticipado,Andrés Soto\n` +
      `2026-05-02,5100.00,5,Tablet Ultra 11",Movilidad,Sede Central Lima,Cyber WOW,Valeria Meza\n` +
      `2026-06-18,1250.00,10,Headset Wireless,Audio,Tienda Arequipa,Cyber WOW,Jorge Silva\n` +
      `2026-07-20,7800.00,6,Laptop Pro 15",Tecnología,Online Ecommerce,Black Friday,Grupo Alfa\n` +
      `2026-08-05,4200.00,14,Mouse Ergonómico,Accesorios,Sede Central Lima,Black Friday,Global Trading`;

    const savedVentasRaw = storageService.saveRawFile('ventas_locales_q1_q2.csv', Buffer.from(sampleVentasCSV, 'utf-8'));

    const dsVentasId = 'ds_ventas_01';
    const dsVentas: Dataset = {
      id: dsVentasId,
      proyecto_id: projVentasId,
      nombre_original: 'ventas_locales_q1_q2.csv',
      nombre_almacenamiento: path.basename(savedVentasRaw.filepath),
      ruta_archivo: savedVentasRaw.relativePath,
      formato: 'csv',
      tamano: savedVentasRaw.size,
      total_filas: 11,
      columnas_detectadas: [
        { nombre: 'fecha', tipo: 'fecha', total_nulos: 0, porcentaje_nulos: 0, total_unicos: 11, ejemplos: ['2026-01-15', '2026-02-05'] },
        { nombre: 'total_soles', tipo: 'decimal', total_nulos: 0, porcentaje_nulos: 0, total_unicos: 11, ejemplos: [1850, 3200], min: 240.5, max: 9800, promedio: 3803.68 },
        { nombre: 'cantidad_vendida', tipo: 'entero', total_nulos: 0, porcentaje_nulos: 0, total_unicos: 7, ejemplos: [2, 5, 1, 3], min: 1, max: 14, promedio: 4.9 },
        { nombre: 'nombre_producto', tipo: 'texto', total_nulos: 0, porcentaje_nulos: 0, total_unicos: 6, ejemplos: ['Laptop Pro 15"', 'Monitor 4K'] },
        { nombre: 'linea', tipo: 'categoria', total_nulos: 0, porcentaje_nulos: 0, total_unicos: 4, ejemplos: ['Tecnología', 'Accesorios'] },
        { nombre: 'sucursal', tipo: 'texto', total_nulos: 0, porcentaje_nulos: 0, total_unicos: 4, ejemplos: ['Sede Central Lima', 'Online Ecommerce'] },
        { nombre: 'evento', tipo: 'texto', total_nulos: 0, porcentaje_nulos: 0, total_unicos: 5, ejemplos: ['Black Friday', 'Cyber WOW'] },
        { nombre: 'cliente', tipo: 'texto', total_nulos: 0, porcentaje_nulos: 0, total_unicos: 11, ejemplos: ['Juan Pérez', 'Tech Corp SAC'] }
      ],
      calidad_metadatos: {
        puntuacion_calidad: 98,
        total_filas: 11,
        total_columnas: 8,
        celdas_vacias: 0,
        duplicados_detectados: 0,
        tiene_coordenadas: false,
        tiene_fechas: true,
        tiene_montos: true
      },
      estado: 'procesado',
      subido_por: analystUser.id,
      subido_en: now,
      actualizado_en: now
    };

    this.state.datasets.push(dsVentas);

    // Mappings for Ventas dataset
    this.state.mapeos.push(
      { id: 'map_01', dataset_id: dsVentasId, columna_origen: 'fecha', columna_canonica: 'fecha', tipo_destino: 'fecha', confianza: 1.0, creado_en: now },
      { id: 'map_02', dataset_id: dsVentasId, columna_origen: 'total_soles', columna_canonica: 'monto_total', tipo_destino: 'decimal', confianza: 0.95, creado_en: now },
      { id: 'map_03', dataset_id: dsVentasId, columna_origen: 'cantidad_vendida', columna_canonica: 'cantidad', tipo_destino: 'entero', confianza: 0.96, creado_en: now },
      { id: 'map_04', dataset_id: dsVentasId, columna_origen: 'nombre_producto', columna_canonica: 'producto', tipo_destino: 'texto', confianza: 0.98, creado_en: now },
      { id: 'map_05', dataset_id: dsVentasId, columna_origen: 'linea', columna_canonica: 'categoria', tipo_destino: 'categoria', confianza: 0.92, creado_en: now },
      { id: 'map_06', dataset_id: dsVentasId, columna_origen: 'sucursal', columna_canonica: 'tienda_origen', tipo_destino: 'texto', confianza: 0.94, creado_en: now },
      { id: 'map_07', dataset_id: dsVentasId, columna_origen: 'evento', columna_canonica: 'campaña', tipo_destino: 'texto', confianza: 0.90, creado_en: now }
    );

    // Master dataset for Ventas
    const masterRowsVentas = [
      { fecha: '2026-01-15', monto_total: 1850.00, cantidad: 2, producto: 'Laptop Pro 15"', categoria: 'Tecnología', tienda_origen: 'Sede Central Lima', campaña: 'Campaña Verano', cliente: 'Juan Pérez' },
      { fecha: '2026-01-18', monto_total: 240.50, cantidad: 5, producto: 'Mouse Ergonómico', categoria: 'Accesorios', tienda_origen: 'Online Ecommerce', campaña: 'Regular', cliente: 'María Gómez' },
      { fecha: '2026-02-05', monto_total: 3200.00, cantidad: 1, producto: 'Monitor 4K Curved', categoria: 'Tecnología', tienda_origen: 'Sede Central Lima', campaña: 'Regular', cliente: 'Tech Corp SAC' },
      { fecha: '2026-02-14', monto_total: 450.00, cantidad: 3, producto: 'Teclado Mecánico RGB', categoria: 'Accesorios', tienda_origen: 'Tienda Arequipa', campaña: 'San Valentín', cliente: 'Carlos Ruiz' },
      { fecha: '2026-03-01', monto_total: 9800.00, cantidad: 4, producto: 'Servidor NAS 4-Bay', categoria: 'Infraestructura', tienda_origen: 'Online Ecommerce', campaña: 'Empresarial', cliente: 'Innova Perú' },
      { fecha: '2026-03-15', monto_total: 2200.00, cantidad: 2, producto: 'Laptop Pro 15"', categoria: 'Tecnología', tienda_origen: 'Tienda Trujillo', campaña: 'Black Friday Anticipado', cliente: 'Lucía Castro' },
      { fecha: '2026-04-10', monto_total: 3400.00, cantidad: 2, producto: 'Monitor 4K Curved', categoria: 'Tecnología', tienda_origen: 'Online Ecommerce', campaña: 'Black Friday Anticipado', cliente: 'Andrés Soto' },
      { fecha: '2026-05-02', monto_total: 5100.00, cantidad: 5, producto: 'Tablet Ultra 11"', categoria: 'Movilidad', tienda_origen: 'Sede Central Lima', campaña: 'Cyber WOW', cliente: 'Valeria Meza' },
      { fecha: '2026-06-18', monto_total: 1250.00, cantidad: 10, producto: 'Headset Wireless', categoria: 'Audio', tienda_origen: 'Tienda Arequipa', campaña: 'Cyber WOW', cliente: 'Jorge Silva' },
      { fecha: '2026-07-20', monto_total: 7800.00, cantidad: 6, producto: 'Laptop Pro 15"', categoria: 'Tecnología', tienda_origen: 'Online Ecommerce', campaña: 'Black Friday', cliente: 'Grupo Alfa' },
      { fecha: '2026-08-05', monto_total: 4200.00, cantidad: 14, producto: 'Mouse Ergonómico', categoria: 'Accesorios', tienda_origen: 'Sede Central Lima', campaña: 'Black Friday', cliente: 'Global Trading' }
    ];

    const savedMasterVentas = storageService.saveProcessedParquetData(projVentasId, 1, masterRowsVentas);
    this.state.datasets_fusionados.push({
      id: 'fusion_ventas_01',
      proyecto_id: projVentasId,
      ruta_parquet: savedMasterVentas.relativePath,
      total_filas_consolidadas: masterRowsVentas.length,
      tamano_mb: savedMasterVentas.sizeMb,
      version: 1,
      esquema_consolidado: [
        { nombre: 'fecha', tipo: 'fecha', origenes: [{ dataset_id: dsVentasId, columna_origen: 'fecha' }] },
        { nombre: 'monto_total', tipo: 'decimal', origenes: [{ dataset_id: dsVentasId, columna_origen: 'total_soles' }] },
        { nombre: 'cantidad', tipo: 'entero', origenes: [{ dataset_id: dsVentasId, columna_origen: 'cantidad_vendida' }] },
        { nombre: 'producto', tipo: 'texto', origenes: [{ dataset_id: dsVentasId, columna_origen: 'nombre_producto' }] },
        { nombre: 'categoria', tipo: 'categoria', origenes: [{ dataset_id: dsVentasId, columna_origen: 'linea' }] },
        { nombre: 'tienda_origen', tipo: 'texto', origenes: [{ dataset_id: dsVentasId, columna_origen: 'sucursal' }] },
        { nombre: 'campaña', tipo: 'texto', origenes: [{ dataset_id: dsVentasId, columna_origen: 'evento' }] }
      ],
      datasets_fuente: [{ id: dsVentasId, nombre: 'ventas_locales_q1_q2.csv', filas_aportadas: masterRowsVentas.length }],
      resumen_calidad: { calidad: 'Óptima', total_filas: masterRowsVentas.length },
      fusionado_por: analystUser.id,
      fusionado_en: now
    });

    // Seed Demo Demografía Master
    const masterRowsDemo = [
      { departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores', latitud: -12.1217, longitud: -77.0297, poblacion: 105400, estrato: 'Medio-Alto', indicador: 8.9 },
      { departamento: 'Lima', provincia: 'Lima', distrito: 'San Isidro', latitud: -12.0969, longitud: -77.0353, poblacion: 68200, estrato: 'Alto', indicador: 9.4 },
      { departamento: 'Lima', provincia: 'Lima', distrito: 'Los Olivos', latitud: -11.9922, longitud: -77.0708, poblacion: 385000, estrato: 'Medio', indicador: 7.2 },
      { departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'Arequipa Centro', latitud: -16.4090, longitud: -71.5375, poblacion: 145000, estrato: 'Medio', indicador: 7.8 },
      { departamento: 'Cusco', provincia: 'Cusco', distrito: 'Cusco', latitud: -13.5319, longitud: -71.9675, poblacion: 128000, estrato: 'Medio', indicador: 8.1 },
      { departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Trujillo', latitud: -8.1160, longitud: -79.0300, poblacion: 314000, estrato: 'Medio', indicador: 7.5 },
      { departamento: 'Piura', provincia: 'Piura', distrito: 'Piura', latitud: -5.1945, longitud: -80.6328, poblacion: 210000, estrato: 'Medio-Bajo', indicador: 6.8 },
      { departamento: 'Lambayeque', provincia: 'Chiclayo', distrito: 'Chiclayo', latitud: -6.7714, longitud: -79.8409, poblacion: 290000, estrato: 'Medio', indicador: 7.1 },
      { departamento: 'Junin', provincia: 'Huancayo', distrito: 'Huancayo', latitud: -12.0651, longitud: -75.2049, poblacion: 185000, estrato: 'Medio', indicador: 6.9 },
      { departamento: 'Loreto', provincia: 'Maynas', distrito: 'Iquitos', latitud: -3.7491, longitud: -73.2538, poblacion: 160000, estrato: 'Medio-Bajo', indicador: 6.3 }
    ];

    const savedMasterDemo = storageService.saveProcessedParquetData(projDemoId, 1, masterRowsDemo);
    this.state.datasets_fusionados.push({
      id: 'fusion_demo_01',
      proyecto_id: projDemoId,
      ruta_parquet: savedMasterDemo.relativePath,
      total_filas_consolidadas: masterRowsDemo.length,
      tamano_mb: savedMasterDemo.sizeMb,
      version: 1,
      esquema_consolidado: [
        { nombre: 'departamento', tipo: 'texto', origenes: [] },
        { nombre: 'latitud', tipo: 'coordenada', origenes: [] },
        { nombre: 'longitud', tipo: 'coordenada', origenes: [] },
        { nombre: 'poblacion', tipo: 'entero', origenes: [] },
        { nombre: 'indicador', tipo: 'decimal', origenes: [] }
      ],
      datasets_fuente: [{ id: 'ds_demo_01', nombre: 'censo_nacional_territorial.csv', filas_aportadas: masterRowsDemo.length }],
      resumen_calidad: { calidad: 'Excelente', total_filas: masterRowsDemo.length },
      fusionado_por: analystUser.id,
      fusionado_en: now
    });

    // Seed Opportunity
    this.state.oportunidades.push({
      id: 'op_01',
      proyecto_id: projVentasId,
      titulo: 'Optimización de Stock en Campaña Black Friday',
      descripcion: 'Los productos Laptop Pro 15" y Monitor 4K incluidos en las campañas Black Friday generan un ticket promedio 3.2x superior al resto de eventos.',
      evidencia: 'Ventas consolidadas en Black Friday superan los $19,400.00 con un 42% del total facturado del año.',
      metrica_detectada: 'Ticket Promedio +140% en Black Friday',
      impacto_estimado: '+$35,000 USD proyectados para el siguiente trimestre',
      estado: 'en_revision',
      creado_por: analystUser.id,
      creado_por_nombre: analystUser.nombre,
      creado_en: now,
      actualizado_en: now
    });

    // Seed Operational Modules (Adaptive Tables)
    const modVentasId = 'mod_ventas_01';
    this.state.modulos.push({
      id: modVentasId,
      empresa_id: empId,
      nombre: 'Gestión Comercial & Ofertas',
      codigo: 'VENTAS_PROMO',
      tipo: 'operativo',
      descripcion: 'Módulos dinámicos para configuración y actualización controlada de campañas comerciales',
      configuracion: {},
      creado_en: now
    });

    const subCampanaId = 'submod_campana_01';
    const subOfertaId = 'submod_oferta_02';

    this.state.submodulos.push(
      {
        id: subCampanaId,
        modulo_id: modVentasId,
        nombre: 'Campañas Comerciales',
        codigo: 'CAMPANAS',
        descripcion: 'Gestión de eventos comerciales activos y planificados (Black Friday, Cyber, etc.)',
        configuracion: {},
        creado_en: now
      },
      {
        id: subOfertaId,
        modulo_id: modVentasId,
        nombre: 'Ofertas y Descuentos Especiales',
        codigo: 'OFERTAS',
        descripcion: 'Descuentos por producto o volumen aprobados para analistas y ejecutivos',
        configuracion: {},
        creado_en: now
      }
    );

    // Dynamic Fields for Campañas
    this.state.campos_dinamicos.push(
      { id: 'fld_01', submodulo_id: subCampanaId, nombre: 'nombre_campana', etiqueta: 'Nombre de Campaña', tipo: 'texto', requerido: true, orden: 1 },
      { id: 'fld_02', submodulo_id: subCampanaId, nombre: 'presupuesto_usd', etiqueta: 'Presupuesto Asignado (USD)', tipo: 'moneda', requerido: true, orden: 2 },
      { id: 'fld_03', submodulo_id: subCampanaId, nombre: 'fecha_inicio', etiqueta: 'Fecha de Inicio', tipo: 'fecha', requerido: true, orden: 3 },
      { id: 'fld_04', submodulo_id: subCampanaId, nombre: 'canal_prioritario', etiqueta: 'Canal Prioritario', tipo: 'select', requerido: true, opciones: ['Ecommerce Online', 'Sede Central', 'Tiendas Regionales', 'Multicanal'], orden: 4 },
      { id: 'fld_05', submodulo_id: subCampanaId, nombre: 'meta_ventas', etiqueta: 'Meta de Ventas Estimada ($)', tipo: 'numero', requerido: false, orden: 5 },
      
      // Fields for Ofertas
      { id: 'fld_06', submodulo_id: subOfertaId, nombre: 'titulo_oferta', etiqueta: 'Título de la Oferta', tipo: 'texto', requerido: true, orden: 1 },
      { id: 'fld_07', submodulo_id: subOfertaId, nombre: 'descuento_porcentaje', etiqueta: 'Porcentaje Descuento (%)', tipo: 'numero', requerido: true, orden: 2 },
      { id: 'fld_08', submodulo_id: subOfertaId, nombre: 'producto_objetivo', etiqueta: 'Producto / Categoría', tipo: 'texto', requerido: true, orden: 3 },
      { id: 'fld_09', submodulo_id: subOfertaId, nombre: 'aprobado_por_gerencia', etiqueta: '¿Aprobación Formal?', tipo: 'booleano', requerido: false, orden: 4 }
    );

    // Seed Operational Records
    this.state.registros_operativos.push(
      {
        id: 'rec_01',
        submodulo_id: subCampanaId,
        datos: {
          nombre_campana: 'Black Friday Extended 2026',
          presupuesto_usd: 15000,
          fecha_inicio: '2026-11-20',
          canal_prioritario: 'Multicanal',
          meta_ventas: 120000
        },
        creado_por: analystUser.id,
        creado_en: now,
        actualizado_en: now
      },
      {
        id: 'rec_02',
        submodulo_id: subCampanaId,
        datos: {
          nombre_campana: 'Cyber WOW Tech Perú',
          presupuesto_usd: 8500,
          fecha_inicio: '2026-07-15',
          canal_prioritario: 'Ecommerce Online',
          meta_ventas: 75000
        },
        creado_por: analystUser.id,
        creado_en: now,
        actualizado_en: now
      },
      {
        id: 'rec_03',
        submodulo_id: subOfertaId,
        datos: {
          titulo_oferta: 'Descuento Bundle Laptop + Monitor 4K',
          descuento_porcentaje: 18,
          producto_objetivo: 'Laptops y Pantallas Pro',
          aprobado_por_gerencia: true
        },
        creado_por: analystUser.id,
        creado_en: now,
        actualizado_en: now
      }
    );

    // Initial audit log
    this.state.auditoria_logs.push({
      id: 'audit_init',
      empresa_id: empId,
      proyecto_id: projVentasId,
      usuario_id: adminUser.id,
      usuario_nombre: adminUser.nombre,
      accion: 'INICIALIZACION_SISTEMA',
      entidad: 'sistema',
      detalles: { mensaje: 'CRM DEXTER inicializado exitosamente con esquema estructurado y seguridad basada en roles.' },
      creado_en: now
    });

    this.saveState();
  }

  // --- REPOSITORY METHODS ---

  // Audit Log
  public addAuditLog(entry: Omit<AuditoriaLog, 'id' | 'creado_en'>) {
    const log: AuditoriaLog = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      creado_en: new Date().toISOString()
    };
    this.state.auditoria_logs.unshift(log);
    if (this.state.auditoria_logs.length > 500) {
      this.state.auditoria_logs = this.state.auditoria_logs.slice(0, 500);
    }
    this.saveState();
    return log;
  }

  public getAuditLogs(empresaId?: string, proyectoId?: string): AuditoriaLog[] {
    return this.state.auditoria_logs.filter(l => {
      if (empresaId && l.empresa_id !== empresaId) return false;
      if (proyectoId && l.proyecto_id !== proyectoId) return false;
      return true;
    });
  }

  // Usuarios & Auth
  public findUserByEmail(email: string): Usuario | undefined {
    return this.state.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): Usuario | undefined {
    return this.state.usuarios.find(u => u.id === id);
  }

  public createUser(user: Omit<Usuario, 'id' | 'creado_en' | 'actualizado_en'>): Usuario {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newUser: Usuario = {
      ...user,
      id,
      creado_en: now,
      actualizado_en: now
    };
    this.state.usuarios.push(newUser);
    this.saveState();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<Usuario>): Usuario {
    const idx = this.state.usuarios.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuario no encontrado');
    this.state.usuarios[idx] = {
      ...this.state.usuarios[idx],
      ...updates,
      actualizado_en: new Date().toISOString()
    };
    this.saveState();
    return this.state.usuarios[idx];
  }

  public listUsersByCompany(empresaId: string): Usuario[] {
    return this.state.usuarios.filter(u => u.empresa_id === empresaId);
  }

  // Permisos
  public getUserPermissions(usuarioId: string, empresaId: string): PermisoAccion[] {
    return this.state.permisos
      .filter(p => p.usuario_id === usuarioId && p.empresa_id === empresaId)
      .map(p => p.permiso);
  }

  public setUserPermissions(usuarioId: string, empresaId: string, permisos: PermisoAccion[]) {
    this.state.permisos = this.state.permisos.filter(
      p => !(p.usuario_id === usuarioId && p.empresa_id === empresaId)
    );
    permisos.forEach(p => {
      this.state.permisos.push({ usuario_id: usuarioId, empresa_id: empresaId, permiso: p });
    });
    this.saveState();
  }

  // Empresas
  public getCompanyById(id: string): Empresa | undefined {
    return this.state.empresas.find(e => e.id === id);
  }

  public createCompany(empresa: Omit<Empresa, 'id' | 'creado_en' | 'actualizado_en'>): Empresa {
    const id = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newEmp: Empresa = { ...empresa, id, creado_en: now, actualizado_en: now };
    this.state.empresas.push(newEmp);
    this.saveState();
    return newEmp;
  }

  // Proyectos
  public listProjects(empresaId: string, usuarioId?: string, rol?: string): Proyecto[] {
    return this.state.proyectos.filter(p => {
      if (p.empresa_id !== empresaId) return false;
      if (rol === 'administrador' || rol === 'propietario_empresa') return true;
      if (p.usuario_propietario_id === usuarioId) return true;
      const isAssigned = this.state.proyectos_usuarios.some(
        pu => pu.proyecto_id === p.id && pu.usuario_id === usuarioId
      );
      return isAssigned;
    });
  }

  public getProjectById(id: string): Proyecto | undefined {
    return this.state.proyectos.find(p => p.id === id);
  }

  public createProject(project: Omit<Proyecto, 'id' | 'creado_en' | 'actualizado_en'>): Proyecto {
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newProj: Proyecto = { ...project, id, creado_en: now, actualizado_en: now };
    this.state.proyectos.push(newProj);
    this.saveState();
    return newProj;
  }

  public updateProject(id: string, updates: Partial<Proyecto>): Proyecto {
    const idx = this.state.proyectos.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Proyecto no encontrado');
    this.state.proyectos[idx] = {
      ...this.state.proyectos[idx],
      ...updates,
      actualizado_en: new Date().toISOString()
    };
    this.saveState();
    return this.state.proyectos[idx];
  }

  public deleteProject(id: string) {
    this.state.proyectos = this.state.proyectos.filter(p => p.id !== id);
    this.state.datasets = this.state.datasets.filter(d => d.proyecto_id !== id);
    this.state.datasets_fusionados = this.state.datasets_fusionados.filter(f => f.proyecto_id !== id);
    this.state.oportunidades = this.state.oportunidades.filter(o => o.proyecto_id !== id);
    this.saveState();
  }

  // Datasets
  public listDatasets(projectId: string): Dataset[] {
    return this.state.datasets.filter(d => d.proyecto_id === projectId);
  }

  public getDatasetById(id: string): Dataset | undefined {
    return this.state.datasets.find(d => d.id === id);
  }

  public createDataset(dataset: Omit<Dataset, 'id' | 'subido_en' | 'actualizado_en'>): Dataset {
    const id = `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newDs: Dataset = { ...dataset, id, subido_en: now, actualizado_en: now };
    this.state.datasets.push(newDs);

    // Update project state if needed
    const proj = this.getProjectById(dataset.proyecto_id);
    if (proj && proj.estado === 'creado') {
      this.updateProject(proj.id, { estado: 'con_datasets' });
    }

    this.saveState();
    return newDs;
  }

  public updateDataset(id: string, updates: Partial<Dataset>): Dataset {
    const idx = this.state.datasets.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Dataset no encontrado');
    this.state.datasets[idx] = {
      ...this.state.datasets[idx],
      ...updates,
      actualizado_en: new Date().toISOString()
    };
    this.saveState();
    return this.state.datasets[idx];
  }

  public deleteDataset(id: string) {
    this.state.datasets = this.state.datasets.filter(d => d.id !== id);
    this.state.mapeos = this.state.mapeos.filter(m => m.dataset_id !== id);
    this.state.transformaciones = this.state.transformaciones.filter(t => t.dataset_id !== id);
    this.saveState();
  }

  // Mappings
  public listMappingsByDataset(datasetId: string): MapeoColumna[] {
    return this.state.mapeos.filter(m => m.dataset_id === datasetId);
  }

  public listMappingsByProject(projectId: string): MapeoColumna[] {
    const projectDatasetIds = this.listDatasets(projectId).map(d => d.id);
    return this.state.mapeos.filter(m => projectDatasetIds.includes(m.dataset_id));
  }

  public saveMapping(mapping: Omit<MapeoColumna, 'id' | 'creado_en'>): MapeoColumna {
    const existingIdx = this.state.mapeos.findIndex(
      m => m.dataset_id === mapping.dataset_id && m.columna_origen === mapping.columna_origen
    );
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      this.state.mapeos[existingIdx] = {
        ...this.state.mapeos[existingIdx],
        ...mapping,
        creado_en: now
      };
      this.saveState();
      return this.state.mapeos[existingIdx];
    } else {
      const id = `map_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newMap: MapeoColumna = { ...mapping, id, creado_en: now };
      this.state.mapeos.push(newMap);
      this.saveState();
      return newMap;
    }
  }

  public deleteMapping(id: string) {
    this.state.mapeos = this.state.mapeos.filter(m => m.id !== id);
    this.saveState();
  }

  // Transformations
  public listTransformations(datasetId: string): TransformacionDataset[] {
    return this.state.transformaciones.filter(t => t.dataset_id === datasetId);
  }

  public addTransformation(t: Omit<TransformacionDataset, 'id' | 'ejecutado_en'>): TransformacionDataset {
    const id = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newT: TransformacionDataset = { ...t, id, ejecutado_en: new Date().toISOString() };
    this.state.transformaciones.push(newT);
    this.saveState();
    return newT;
  }

  public deleteTransformation(id: string) {
    this.state.transformaciones = this.state.transformaciones.filter(t => t.id !== id);
    this.saveState();
  }

  // Fused Datasets / Master
  public getLatestFusedDataset(projectId: string): DatasetFusionado | undefined {
    const matches = this.state.datasets_fusionados
      .filter(f => f.proyecto_id === projectId)
      .sort((a, b) => b.version - a.version);
    return matches[0];
  }

  public createFusedDataset(f: Omit<DatasetFusionado, 'id'>): DatasetFusionado {
    const id = `fusion_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newF: DatasetFusionado = { ...f, id };
    this.state.datasets_fusionados.push(newF);

    // Update project state
    this.updateProject(f.proyecto_id, { estado: 'procesado' });

    this.saveState();
    return newF;
  }

  // Oportunidades
  public listOpportunities(projectId: string): Oportunidad[] {
    return this.state.oportunidades.filter(o => o.proyecto_id === projectId);
  }

  public getOpportunityById(id: string): Oportunidad | undefined {
    return this.state.oportunidades.find(o => o.id === id);
  }

  public createOpportunity(op: Omit<Oportunidad, 'id' | 'creado_en' | 'actualizado_en'>): Oportunidad {
    const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newOp: Oportunidad = { ...op, id, creado_en: now, actualizado_en: now };
    this.state.oportunidades.unshift(newOp);
    this.saveState();
    return newOp;
  }

  public updateOpportunity(id: string, updates: Partial<Oportunidad>): Oportunidad {
    const idx = this.state.oportunidades.findIndex(o => o.id === id);
    if (idx === -1) throw new Error('Oportunidad no encontrada');
    this.state.oportunidades[idx] = {
      ...this.state.oportunidades[idx],
      ...updates,
      actualizado_en: new Date().toISOString()
    };
    this.saveState();
    return this.state.oportunidades[idx];
  }

  // Operational Modules & Dynamic Fields
  public listModules(empresaId: string): ModuloOperativo[] {
    return this.state.modulos.filter(m => m.empresa_id === empresaId);
  }

  public listSubmodules(moduloId: string): SubmoduloOperativo[] {
    return this.state.submodulos.filter(s => s.modulo_id === moduloId);
  }

  public listDynamicFields(submoduloId: string): CampoDinamico[] {
    return this.state.campos_dinamicos
      .filter(f => f.submodulo_id === submoduloId)
      .sort((a, b) => a.orden - b.orden);
  }

  public listOperationalRecords(submoduloId: string): RegistroOperativo[] {
    return this.state.registros_operativos.filter(r => r.submodulo_id === submoduloId);
  }

  public createOperationalRecord(rec: Omit<RegistroOperativo, 'id' | 'creado_en' | 'actualizado_en'>): RegistroOperativo {
    const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newRec: RegistroOperativo = { ...rec, id, creado_en: now, actualizado_en: now };
    this.state.registros_operativos.unshift(newRec);
    this.saveState();
    return newRec;
  }

  public updateOperationalRecord(id: string, datos: Record<string, any>, userId: string): RegistroOperativo {
    const idx = this.state.registros_operativos.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Registro operativo no encontrado');
    this.state.registros_operativos[idx] = {
      ...this.state.registros_operativos[idx],
      datos: { ...this.state.registros_operativos[idx].datos, ...datos },
      actualizado_por: userId,
      actualizado_en: new Date().toISOString()
    };
    this.saveState();
    return this.state.registros_operativos[idx];
  }

  public deleteOperationalRecord(id: string) {
    this.state.registros_operativos = this.state.registros_operativos.filter(r => r.id !== id);
    this.saveState();
  }
}

export const dbRepository = new DBRepository();
