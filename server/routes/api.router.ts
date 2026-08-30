import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { dbRepository } from '../db/repository.ts';
import { storageService } from '../storage/storage.service.ts';
import { AuthService, authMiddleware, requirePermission, requireRole, AuthenticatedRequest } from '../auth/auth.service.ts';
import { DatasetParser } from '../engine/parser.ts';
import { ColumnAnalyzer } from '../engine/column-analyzer.ts';
import { SemanticMatcher, ESQUEMAS_CANONICOS } from '../engine/semantic-matcher.ts';
import { CleaningPipeline } from '../engine/cleaning-pipeline.ts';
import { FusionEngine } from '../engine/fusion-engine.ts';
import { AnalyticsEngine } from '../engine/analytics-engine.ts';
import { RolUsuario, PermisoAccion, RubroProyecto, TipoTransformacion, EstadoOportunidad } from '../types.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & USERS
// ==========================================

apiRouter.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = dbRepository.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPass = AuthService.comparePassword(password, user.password_hash);
    if (!validPass) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.estado !== 'activo') {
      return res.status(403).json({ error: 'Esta cuenta está suspendida o inactiva' });
    }

    // Update last access
    dbRepository.updateUser(user.id, { ultimo_acceso: new Date().toISOString() });

    const token = AuthService.generateToken(user);
    const empresa = dbRepository.getCompanyById(user.empresa_id);
    const permissions = dbRepository.getUserPermissions(user.id, user.empresa_id);

    dbRepository.addAuditLog({
      empresa_id: user.empresa_id,
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      accion: 'LOGIN_EXITOSO',
      entidad: 'usuario',
      entidad_id: user.id,
      detalles: { email: user.email, rol: user.rol }
    });

    const { password_hash, ...safeUser } = user;
    return res.json({
      token,
      user: safeUser,
      empresa,
      permissions
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error en el servidor' });
  }
});

apiRouter.post('/auth/register', (req, res) => {
  try {
    const { nombre, email, password, nombre_empresa } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }

    const existing = dbRepository.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico' });
    }

    // Create Company if provided or default
    const company = dbRepository.createCompany({
      nombre: nombre_empresa || `Empresa de ${nombre}`,
      activo: true
    });

    const hashedPassword = AuthService.hashPassword(password);
    const newUser = dbRepository.createUser({
      empresa_id: company.id,
      nombre,
      email,
      password_hash: hashedPassword,
      rol: 'propietario_empresa',
      estado: 'activo'
    });

    // Default permissions for owner
    const allPerms: PermisoAccion[] = [
      'ver_datos', 'analizar_datos', 'subir_datasets', 'limpiar_datos',
      'procesar_datasets', 'crear_oportunidades', 'proponer_cambios',
      'aprobar_cambios', 'modificar_ofertas', 'modificar_campanas', 'administrar_usuarios'
    ];
    dbRepository.setUserPermissions(newUser.id, company.id, allPerms);

    const token = AuthService.generateToken(newUser);
    const { password_hash, ...safeUser } = newUser;

    return res.json({
      token,
      user: safeUser,
      empresa: company,
      permissions: allPerms
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error al registrar usuario' });
  }
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const empresa = dbRepository.getCompanyById(user.empresa_id);
  const permissions = req.userPermissions || [];
  const { password_hash, ...safeUser } = user;
  return res.json({
    user: safeUser,
    empresa,
    permissions
  });
});

apiRouter.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = dbRepository.findUserByEmail(email);
  if (!user) {
    // Return standard message to avoid email enumeration
    return res.json({ message: 'Si el correo existe, se han enviado instrucciones para restablecer la contraseña.' });
  }

  dbRepository.addAuditLog({
    empresa_id: user.empresa_id,
    usuario_id: user.id,
    usuario_nombre: user.nombre,
    accion: 'SOLICITUD_RECUPERACION_CONTRASENA',
    entidad: 'usuario',
    entidad_id: user.id,
    detalles: { email }
  });

  return res.json({
    message: 'Solicitud procesada. En este entorno de demostración, puedes utilizar el acceso de prueba o restablecer la clave directamente.'
  });
});

// ==========================================
// 2. COMPANIES, TEAMS & PERMISSIONS
// ==========================================

apiRouter.get('/companies/users', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const users = dbRepository.listUsersByCompany(user.empresa_id).map(u => {
    const { password_hash, ...safe } = u;
    const perms = dbRepository.getUserPermissions(u.id, user.empresa_id);
    return { ...safe, permisos: perms };
  });
  return res.json({ users });
});

apiRouter.post('/companies/invite', authMiddleware, requireRole('administrador', 'propietario_empresa'), (req: AuthenticatedRequest, res) => {
  try {
    const { nombre, email, rol = 'analista', permisos = [] } = req.body;
    const adminUser = req.user!;

    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    const existing = dbRepository.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'El usuario ya existe en el sistema' });
    }

    const tempPassword = 'DexterTemp2026!';
    const password_hash = AuthService.hashPassword(tempPassword);

    const newUser = dbRepository.createUser({
      empresa_id: adminUser.empresa_id,
      nombre,
      email,
      password_hash,
      rol: rol as RolUsuario,
      estado: 'activo'
    });

    const permsToAssign: PermisoAccion[] = permisos.length > 0 ? permisos : [
      'ver_datos', 'analizar_datos', 'subir_datasets', 'limpiar_datos', 'procesar_datasets', 'crear_oportunidades', 'proponer_cambios'
    ];
    dbRepository.setUserPermissions(newUser.id, adminUser.empresa_id, permsToAssign);

    dbRepository.addAuditLog({
      empresa_id: adminUser.empresa_id,
      usuario_id: adminUser.id,
      usuario_nombre: adminUser.nombre,
      accion: 'INVITAR_USUARIO',
      entidad: 'usuario',
      entidad_id: newUser.id,
      detalles: { nuevo_usuario: email, rol, permisos: permsToAssign }
    });

    const { password_hash: _, ...safeUser } = newUser;
    return res.json({
      user: safeUser,
      mensaje: `Usuario invitado con éxito. Clave temporal asignada: ${tempPassword}`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/companies/permissions', authMiddleware, requireRole('administrador', 'propietario_empresa'), (req: AuthenticatedRequest, res) => {
  try {
    const { usuario_id, permisos } = req.body;
    const adminUser = req.user!;

    if (!usuario_id || !Array.isArray(permisos)) {
      return res.status(400).json({ error: 'ID de usuario y lista de permisos son requeridos' });
    }

    dbRepository.setUserPermissions(usuario_id, adminUser.empresa_id, permisos);

    dbRepository.addAuditLog({
      empresa_id: adminUser.empresa_id,
      usuario_id: adminUser.id,
      usuario_nombre: adminUser.nombre,
      accion: 'ACTUALIZAR_PERMISOS',
      entidad: 'usuario',
      entidad_id: usuario_id,
      detalles: { permisos_asignados: permisos }
    });

    return res.json({ success: true, permisos });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. PROJECTS & PROGRESSIVE FLOW
// ==========================================

apiRouter.get('/projects', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const projects = dbRepository.listProjects(user.empresa_id, user.id, user.rol);
  return res.json({ projects });
});

apiRouter.post('/projects', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { nombre, rubro = 'ventas', descripcion = '' } = req.body;
    const user = req.user!;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del proyecto es obligatorio' });
    }

    const project = dbRepository.createProject({
      usuario_propietario_id: user.id,
      empresa_id: user.empresa_id,
      nombre: nombre.trim(),
      rubro: rubro as RubroProyecto,
      descripcion: descripcion.trim(),
      estado: 'creado'
    });

    dbRepository.addAuditLog({
      empresa_id: user.empresa_id,
      proyecto_id: project.id,
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      accion: 'CREAR_PROYECTO',
      entidad: 'proyecto',
      entidad_id: project.id,
      detalles: { nombre: project.nombre, rubro: project.rubro }
    });

    return res.json({ project });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/projects/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  const project = dbRepository.getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  return res.json({ project });
});

apiRouter.get('/projects/:id/flow-status', authMiddleware, (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id;
  const project = dbRepository.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const datasets = dbRepository.listDatasets(projectId);
  const mappings = dbRepository.listMappingsByProject(projectId);
  const fused = dbRepository.getLatestFusedDataset(projectId);

  const hasDatasets = datasets.length > 0;
  const hasMappings = mappings.length > 0;
  const isProcessed = Boolean(fused) || project.estado === 'procesado';

  // Progressive Lock Evaluation
  const flow = {
    projectId,
    rubro: project.rubro,
    hasDatasets,
    hasMappings,
    isProcessed,
    unlockedModules: {
      datasets: true, // Always unlocked if project exists
      exploration: hasDatasets,
      mapping: hasDatasets,
      cleaning: hasDatasets,
      fusion: hasDatasets && hasMappings,
      dashboard: isProcessed,
      opportunities: isProcessed,
      operational_modules: true,
      team: true,
      reports: isProcessed
    },
    missingRequirements: {
      exploration: hasDatasets ? null : 'Debes subir al menos un dataset CSV o XLSX.',
      mapping: hasDatasets ? null : 'Debes subir al menos un dataset antes de configurar el mapeo semántico.',
      cleaning: hasDatasets ? null : 'La limpieza avanzada requiere datasets cargados.',
      fusion: !hasDatasets ? 'Sube datasets primero.' : (!hasMappings ? 'Configura el mapeo semántico de columnas antes de fusionar.' : null),
      dashboard: isProcessed ? null : 'Completa la fusión o procesamiento para habilitar el dashboard analítico.',
      reports: isProcessed ? null : 'Requiere dataset maestro procesado para exportar el informe ejecutivo.'
    }
  };

  return res.json(flow);
});

apiRouter.delete('/projects/:id', authMiddleware, requireRole('administrador', 'propietario_empresa'), (req: AuthenticatedRequest, res) => {
  const project = dbRepository.getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  dbRepository.deleteProject(req.params.id);
  return res.json({ success: true, message: 'Proyecto eliminado con éxito' });
});

// ==========================================
// 4. DATASETS: UPLOAD, PREVIEW, STATS
// ==========================================

apiRouter.post('/datasets/upload', authMiddleware, requirePermission('subir_datasets'), upload.array('archivos', 10), (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const projectId = req.body.proyecto_id;
    const files = req.files as Express.Multer.File[];

    if (!projectId) return res.status(400).json({ error: 'Se requiere el ID del proyecto' });
    if (!files || files.length === 0) return res.status(400).json({ error: 'No se recibieron archivos' });

    const project = dbRepository.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const createdDatasets = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      if (ext !== 'csv' && ext !== 'xlsx') {
        return res.status(400).json({ error: `Formato no permitido: .${ext}. Solo se admiten CSV y XLSX.` });
      }

      // 1. Save original raw file
      const savedRaw = storageService.saveRawFile(file.originalname, file.buffer);

      // 2. Parse file
      const parsed = DatasetParser.parseFile(file.buffer, ext as 'csv' | 'xlsx');

      // 3. Analyze columns and quality
      const analysis = ColumnAnalyzer.analyze(parsed.rows, parsed.headers);

      // 4. Save metadata to DB repository
      const newDs = dbRepository.createDataset({
        proyecto_id: projectId,
        nombre_original: file.originalname,
        nombre_almacenamiento: path.basename(savedRaw.filepath),
        ruta_archivo: savedRaw.relativePath,
        formato: ext as 'csv' | 'xlsx',
        tamano: savedRaw.size,
        total_filas: parsed.totalRows,
        columnas_detectadas: analysis.columnas,
        calidad_metadatos: analysis.calidad,
        estado: 'analizado',
        subido_por: user.id
      });

      // 5. Auto-suggest and save initial high-confidence mappings
      for (const col of analysis.columnas) {
        const suggestion = SemanticMatcher.matchColumn(col.nombre, project.rubro, col.ejemplos);
        if (suggestion && suggestion.confianza >= 0.70) {
          dbRepository.saveMapping({
            dataset_id: newDs.id,
            columna_origen: col.nombre,
            columna_canonica: suggestion.columna_canonica_sugerida,
            tipo_destino: col.tipo,
            confianza: suggestion.confianza
          });
        }
      }

      dbRepository.addAuditLog({
        empresa_id: user.empresa_id,
        proyecto_id: projectId,
        usuario_id: user.id,
        usuario_nombre: user.nombre,
        accion: 'SUBIR_DATASET',
        entidad: 'dataset',
        entidad_id: newDs.id,
        detalles: { nombre: file.originalname, filas: parsed.totalRows, tamano: savedRaw.size }
      });

      createdDatasets.push(newDs);
    }

    return res.json({ datasets: createdDatasets });
  } catch (err: any) {
    console.error('Error al subir dataset:', err);
    return res.status(500).json({ error: err.message || 'Error en procesamiento de archivo' });
  }
});

apiRouter.get('/datasets/by-project/:projectId', authMiddleware, (req: AuthenticatedRequest, res) => {
  const datasets = dbRepository.listDatasets(req.params.projectId);
  return res.json({ datasets });
});

apiRouter.get('/datasets/:id/preview', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const dataset = dbRepository.getDatasetById(req.params.id);
    if (!dataset) return res.status(404).json({ error: 'Dataset no encontrado' });

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const search = (req.query.search as string || '').toLowerCase();

    // Read raw file
    const buffer = storageService.readRawFile(dataset.ruta_archivo);
    const parsed = DatasetParser.parseFile(buffer, dataset.formato);

    // Apply any saved transformations
    const transforms = dbRepository.listTransformations(dataset.id);
    let transformedRows = parsed.rows;
    let transformedHeaders = parsed.headers;

    for (const t of transforms) {
      const resClean = CleaningPipeline.applyTransformation(
        transformedRows,
        transformedHeaders,
        t.tipo_transformacion,
        t.columna,
        t.configuracion
      );
      transformedRows = resClean.rows;
      transformedHeaders = resClean.headers;
    }

    // Filter
    let filtered = transformedRows;
    if (search) {
      filtered = filtered.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(search))
      );
    }

    const total = filtered.length;
    const startIdx = (page - 1) * pageSize;
    const pagedRows = filtered.slice(startIdx, startIdx + pageSize);

    return res.json({
      dataset,
      headers: transformedHeaders,
      rows: pagedRows,
      pagination: {
        page,
        pageSize,
        totalRows: total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/datasets/:id', authMiddleware, requirePermission('subir_datasets'), (req: AuthenticatedRequest, res) => {
  const ds = dbRepository.getDatasetById(req.params.id);
  if (!ds) return res.status(404).json({ error: 'Dataset no encontrado' });
  dbRepository.deleteDataset(req.params.id);
  return res.json({ success: true, message: 'Dataset eliminado' });
});

// ==========================================
// 5. MAPPINGS & SEMANTIC COMPARISON
// ==========================================

apiRouter.get('/mappings/compare/:projectId', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const projectId = req.params.projectId;
    const project = dbRepository.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const datasets = dbRepository.listDatasets(projectId);
    const canonicalSchema = ESQUEMAS_CANONICOS[project.rubro] || ESQUEMAS_CANONICOS.ventas;

    const dsInput = datasets.map(d => ({
      id: d.id,
      nombre: d.nombre_original,
      columnas: d.columnas_detectadas.map(c => ({
        nombre: c.nombre,
        tipo: c.tipo,
        ejemplos: c.ejemplos
      }))
    }));

    const comparison = SemanticMatcher.compareDatasetsColumns(dsInput, project.rubro);
    const existingMappings = dbRepository.listMappingsByProject(projectId);

    return res.json({
      rubro: project.rubro,
      esquema_canonico: canonicalSchema,
      datasets: datasets.map(d => ({ id: d.id, nombre: d.nombre_original, columnas: d.columnas_detectadas })),
      comparacion: comparison.columnas_comparadas,
      mapeos_guardados: existingMappings
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/mappings/save', authMiddleware, requirePermission('analizar_datos'), (req: AuthenticatedRequest, res) => {
  try {
    const { dataset_id, columna_origen, columna_canonica, tipo_destino = 'texto', confianza = 1.0 } = req.body;
    if (!dataset_id || !columna_origen || !columna_canonica) {
      return res.status(400).json({ error: 'Faltan parámetros de mapeo obligatorios' });
    }

    const mapping = dbRepository.saveMapping({
      dataset_id,
      columna_origen,
      columna_canonica,
      tipo_destino,
      confianza
    });

    return res.json({ mapping });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/mappings/save-batch', authMiddleware, requirePermission('analizar_datos'), (req: AuthenticatedRequest, res) => {
  try {
    const { mapeos } = req.body;
    if (!Array.isArray(mapeos)) {
      return res.status(400).json({ error: 'Formato inválido para mapeos batch' });
    }

    const saved = mapeos.map(m => dbRepository.saveMapping({
      dataset_id: m.dataset_id,
      columna_origen: m.columna_origen,
      columna_canonica: m.columna_canonica,
      tipo_destino: m.tipo_destino || 'texto',
      confianza: m.confianza || 1.0
    }));

    return res.json({ mapeos: saved });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. TRANSFORMATIONS & CLEANING
// ==========================================

apiRouter.get('/transformations/by-dataset/:datasetId', authMiddleware, (req: AuthenticatedRequest, res) => {
  const trans = dbRepository.listTransformations(req.params.datasetId);
  return res.json({ transformaciones: trans });
});

apiRouter.post('/transformations/apply', authMiddleware, requirePermission('limpiar_datos'), (req: AuthenticatedRequest, res) => {
  try {
    const { dataset_id, tipo_transformacion, columna, configuracion = {} } = req.body;
    const user = req.user!;

    const dataset = dbRepository.getDatasetById(dataset_id);
    if (!dataset) return res.status(404).json({ error: 'Dataset no encontrado' });

    // Read raw file and apply existing transformations
    const buffer = storageService.readRawFile(dataset.ruta_archivo);
    const parsed = DatasetParser.parseFile(buffer, dataset.formato);

    const existingTransforms = dbRepository.listTransformations(dataset_id);
    let curRows = parsed.rows;
    let curHeaders = parsed.headers;

    for (const t of existingTransforms) {
      const cRes = CleaningPipeline.applyTransformation(curRows, curHeaders, t.tipo_transformacion, t.columna, t.configuracion);
      curRows = cRes.rows;
      curHeaders = cRes.headers;
    }

    // Apply the NEW transformation
    const cleanResult = CleaningPipeline.applyTransformation(
      curRows,
      curHeaders,
      tipo_transformacion as TipoTransformacion,
      columna,
      configuracion
    );

    // Save record to DB
    const transRecord = dbRepository.addTransformation({
      dataset_id,
      tipo_transformacion,
      columna,
      configuracion,
      filas_afectadas: cleanResult.filas_afectadas,
      filas_antes: cleanResult.filas_antes,
      filas_despues: cleanResult.filas_despues,
      ejecutado_por: user.id
    });

    dbRepository.addAuditLog({
      empresa_id: user.empresa_id,
      proyecto_id: dataset.proyecto_id,
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      accion: 'APLICAR_LIMPIEZA_DATOS',
      entidad: 'transformacion',
      entidad_id: transRecord.id,
      detalles: {
        tipo: tipo_transformacion,
        columna,
        filas_afectadas: cleanResult.filas_afectadas,
        resumen: cleanResult.resumen_accion
      }
    });

    return res.json({
      transformacion: transRecord,
      resumen_accion: cleanResult.resumen_accion,
      filas_antes: cleanResult.filas_antes,
      filas_despues: cleanResult.filas_despues,
      filas_afectadas: cleanResult.filas_afectadas
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/transformations/:id', authMiddleware, requirePermission('limpiar_datos'), (req: AuthenticatedRequest, res) => {
  dbRepository.deleteTransformation(req.params.id);
  return res.json({ success: true, message: 'Transformación revertida' });
});

// ==========================================
// 7. FUSION & MASTER DATASET
// ==========================================

apiRouter.post('/fusion/execute', authMiddleware, requirePermission('procesar_datasets'), (req: AuthenticatedRequest, res) => {
  try {
    const { proyecto_id } = req.body;
    const user = req.user!;

    const project = dbRepository.getProjectById(proyecto_id);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const datasets = dbRepository.listDatasets(proyecto_id);
    if (datasets.length === 0) {
      return res.status(400).json({ error: 'No hay datasets disponibles para fusionar' });
    }

    const mapeos = dbRepository.listMappingsByProject(proyecto_id);
    const transformaciones = datasets.flatMap(d => dbRepository.listTransformations(d.id));

    const latest = dbRepository.getLatestFusedDataset(proyecto_id);
    const nextVersion = latest ? latest.version + 1 : 1;

    const result = FusionEngine.fuseDatasets({
      projectId: proyecto_id,
      datasets,
      mapeos,
      transformaciones,
      userId: user.id,
      version: nextVersion
    });

    const savedFusion = dbRepository.createFusedDataset(result.fusionRecord);

    dbRepository.addAuditLog({
      empresa_id: user.empresa_id,
      proyecto_id,
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      accion: 'FUSIONAR_DATASETS',
      entidad: 'dataset_fusionado',
      entidad_id: savedFusion.id,
      detalles: {
        total_filas: savedFusion.total_filas_consolidadas,
        version: savedFusion.version,
        ruta: savedFusion.ruta_parquet
      }
    });

    return res.json({
      fusion: savedFusion,
      filas_totales: result.masterRows.length,
      muestra_filas: result.masterRows.slice(0, 100)
    });
  } catch (err: any) {
    console.error('Error en fusión de datasets:', err);
    return res.status(500).json({ error: err.message || 'Error en motor de fusión' });
  }
});

apiRouter.get('/fusion/latest/:projectId', authMiddleware, (req: AuthenticatedRequest, res) => {
  const latest = dbRepository.getLatestFusedDataset(req.params.projectId);
  if (!latest) return res.status(404).json({ error: 'No hay dataset maestro procesado para este proyecto' });
  return res.json({ fusion: latest });
});

// ==========================================
// 8. INTELLIGENT ANALYTICS & DASHBOARD
// ==========================================

apiRouter.get('/analytics/dashboard/:projectId', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const projectId = req.params.projectId;
    const project = dbRepository.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    // Load master data
    let masterRows = storageService.readProcessedData(projectId);

    // Fallback: If not yet fused, load first dataset if available
    if (!masterRows) {
      const datasets = dbRepository.listDatasets(projectId);
      if (datasets.length > 0) {
        const buffer = storageService.readRawFile(datasets[0].ruta_archivo);
        const parsed = DatasetParser.parseFile(buffer, datasets[0].formato);
        masterRows = parsed.rows;
      } else {
        masterRows = [];
      }
    }

    const dashboard = AnalyticsEngine.generateDashboard(masterRows, project.rubro);
    return res.json(dashboard);
  } catch (err: any) {
    console.error('Error al generar dashboard:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. OPPORTUNITY DETECTION & WORKFLOW
// ==========================================

apiRouter.get('/opportunities/by-project/:projectId', authMiddleware, (req: AuthenticatedRequest, res) => {
  const ops = dbRepository.listOpportunities(req.params.projectId);
  return res.json({ oportunidades: ops });
});

apiRouter.post('/opportunities', authMiddleware, requirePermission('crear_oportunidades'), (req: AuthenticatedRequest, res) => {
  try {
    const { proyecto_id, titulo, descripcion, evidencia, metrica_detectada, impacto_estimado } = req.body;
    const user = req.user!;

    if (!proyecto_id || !titulo || !descripcion || !evidencia) {
      return res.status(400).json({ error: 'Título, descripción y evidencia son obligatorios' });
    }

    const op = dbRepository.createOpportunity({
      proyecto_id,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      evidencia: evidencia.trim(),
      metrica_detectada,
      impacto_estimado,
      estado: 'detectada',
      creado_por: user.id,
      creado_por_nombre: user.nombre
    });

    dbRepository.addAuditLog({
      empresa_id: user.empresa_id,
      proyecto_id,
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      accion: 'CREAR_OPORTUNIDAD',
      entidad: 'oportunidad',
      entidad_id: op.id,
      detalles: { titulo: op.titulo, impacto: op.impacto_estimado }
    });

    return res.json({ oportunidad: op });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/opportunities/:id/status', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { nuevo_estado, notas_revision } = req.body;
    const user = req.user!;

    const op = dbRepository.getOpportunityById(id);
    if (!op) return res.status(404).json({ error: 'Oportunidad no encontrada' });

    // Role-based authorization on state transitions
    if (nuevo_estado === 'aprobada' || nuevo_estado === 'rechazada') {
      if (user.rol !== 'administrador' && user.rol !== 'propietario_empresa') {
        const canApprove = req.userPermissions?.includes('aprobar_cambios');
        if (!canApprove) {
          return res.status(403).json({ error: 'Se requiere permiso de aprobación para cambiar este estado.' });
        }
      }
    }

    const updates: Partial<typeof op> = {
      estado: nuevo_estado as EstadoOportunidad,
      notas_revision: notas_revision || op.notas_revision
    };

    if (nuevo_estado === 'en_revision') updates.revisado_por = user.id;
    if (nuevo_estado === 'aprobada' || nuevo_estado === 'rechazada') updates.aprobado_por = user.id;
    if (nuevo_estado === 'implementada') updates.implementado_por = user.id;

    const updated = dbRepository.updateOpportunity(id, updates);

    dbRepository.addAuditLog({
      empresa_id: user.empresa_id,
      proyecto_id: op.proyecto_id,
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      accion: 'CAMBIO_ESTADO_OPORTUNIDAD',
      entidad: 'oportunidad',
      entidad_id: op.id,
      detalles: { estado_anterior: op.estado, nuevo_estado, notas: notas_revision }
    });

    return res.json({ oportunidad: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. ADAPTIVE OPERATIONAL TABLES (DYNAMIC MODULES)
// ==========================================

apiRouter.get('/modules', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const modules = dbRepository.listModules(user.empresa_id);
  return res.json({ modulos: modules });
});

apiRouter.get('/modules/:moduleId/submodules', authMiddleware, (req: AuthenticatedRequest, res) => {
  const submodules = dbRepository.listSubmodules(req.params.moduleId);
  return res.json({ submodulos: submodules });
});

apiRouter.get('/modules/submodules/:submoduleId/fields', authMiddleware, (req: AuthenticatedRequest, res) => {
  const fields = dbRepository.listDynamicFields(req.params.submoduleId);
  return res.json({ campos: fields });
});

apiRouter.get('/modules/submodules/:submoduleId/records', authMiddleware, (req: AuthenticatedRequest, res) => {
  const records = dbRepository.listOperationalRecords(req.params.submoduleId);
  return res.json({ registros: records });
});

apiRouter.post('/modules/submodules/:submoduleId/records', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { submoduleId } = req.params;
    const { datos } = req.body;
    const user = req.user!;

    if (!datos || typeof datos !== 'object') {
      return res.status(400).json({ error: 'Datos no válidos' });
    }

    const fields = dbRepository.listDynamicFields(submoduleId);
    // Strict schema field validation (No arbitrary SQL injection)
    for (const f of fields) {
      if (f.requerido && (datos[f.nombre] === undefined || datos[f.nombre] === null || datos[f.nombre] === '')) {
        return res.status(400).json({ error: `El campo "${f.etiqueta}" es obligatorio` });
      }
    }

    const record = dbRepository.createOperationalRecord({
      submodulo_id: submoduleId,
      datos,
      creado_por: user.id
    });

    dbRepository.addAuditLog({
      empresa_id: user.empresa_id,
      usuario_id: user.id,
      usuario_nombre: user.nombre,
      accion: 'CREAR_REGISTRO_OPERATIVO',
      entidad: 'registro_operativo',
      entidad_id: record.id,
      detalles: { submodulo_id: submoduleId, datos }
    });

    return res.json({ registro: record });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/modules/records/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { datos } = req.body;
    const user = req.user!;

    const updated = dbRepository.updateOperationalRecord(id, datos, user.id);
    return res.json({ registro: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/modules/records/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
  dbRepository.deleteOperationalRecord(req.params.id);
  return res.json({ success: true, message: 'Registro eliminado' });
});

// ==========================================
// 11. REPORTS & AUDIT LOGS
// ==========================================

apiRouter.get('/reports/executive/:projectId', authMiddleware, (req: AuthenticatedRequest, res) => {
  try {
    const projectId = req.params.projectId;
    const project = dbRepository.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

    const datasets = dbRepository.listDatasets(projectId);
    const fused = dbRepository.getLatestFusedDataset(projectId);
    const ops = dbRepository.listOpportunities(projectId);
    const masterRows = storageService.readProcessedData(projectId) || [];
    const dashboard = AnalyticsEngine.generateDashboard(masterRows, project.rubro);

    return res.json({
      proyecto: project,
      resumen_ejecutivo: {
        titulo: `Informe Ejecutivo de Inteligencia de Datos - ${project.nombre}`,
        rubro: project.rubro,
        fecha_generacion: new Date().toISOString(),
        total_datasets_consolidados: datasets.length,
        total_filas_analizadas: masterRows.length,
        version_maestro: fused ? fused.version : 1,
        tamano_almacenamiento: fused ? `${fused.tamano_mb} MB` : 'N/A'
      },
      kpis: dashboard.kpis,
      insights: dashboard.insights_detectados,
      oportunidades: ops,
      estimacion: dashboard.estimacion_ventas,
      mapa_calor: dashboard.datos_mapa_calor
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/audit/logs', authMiddleware, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const logs = dbRepository.getAuditLogs(user.empresa_id);
  return res.json({ logs });
});
