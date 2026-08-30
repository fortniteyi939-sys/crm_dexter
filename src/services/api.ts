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
  FlowStatus,
  PermisoAccion,
  RubroProyecto
} from '../types/index.ts';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('crm_dexter_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('crm_dexter_token', token);
    } else {
      localStorage.removeItem('crm_dexter_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
    }

    return data as T;
  }

  // --- AUTH ---
  public async login(email: string, password: string): Promise<{ token: string; user: Usuario; empresa: Empresa; permissions: PermisoAccion[] }> {
    const res = await this.request<{ token: string; user: Usuario; empresa: Empresa; permissions: PermisoAccion[] }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    return res;
  }

  public async register(data: { nombre: string; email: string; password: string; nombre_empresa?: string }): Promise<{ token: string; user: Usuario; empresa: Empresa; permissions: PermisoAccion[] }> {
    const res = await this.request<{ token: string; user: Usuario; empresa: Empresa; permissions: PermisoAccion[] }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe(): Promise<{ user: Usuario; empresa: Empresa; permissions: PermisoAccion[] }> {
    return this.request<{ user: Usuario; empresa: Empresa; permissions: PermisoAccion[] }>('/auth/me');
  }

  public async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  public logout() {
    this.setToken(null);
  }

  // --- TEAM & USERS ---
  public async listUsers(): Promise<{ users: Usuario[] }> {
    return this.request<{ users: Usuario[] }>('/companies/users');
  }

  public async inviteUser(data: { nombre: string; email: string; rol: string; permisos?: PermisoAccion[] }): Promise<{ user: Usuario; mensaje: string }> {
    return this.request<{ user: Usuario; mensaje: string }>('/companies/invite', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updatePermissions(usuario_id: string, permisos: PermisoAccion[]): Promise<{ success: boolean; permisos: PermisoAccion[] }> {
    return this.request<{ success: boolean; permisos: PermisoAccion[] }>('/companies/permissions', {
      method: 'POST',
      body: JSON.stringify({ usuario_id, permisos })
    });
  }

  // --- PROJECTS ---
  public async listProjects(): Promise<{ projects: Proyecto[] }> {
    return this.request<{ projects: Proyecto[] }>('/projects');
  }

  public async createProject(data: { nombre: string; rubro: RubroProyecto; descripcion?: string }): Promise<{ project: Proyecto }> {
    return this.request<{ project: Proyecto }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async getProject(id: string): Promise<{ project: Proyecto }> {
    return this.request<{ project: Proyecto }>(`/projects/${id}`);
  }

  public async getFlowStatus(projectId: string): Promise<FlowStatus> {
    return this.request<FlowStatus>(`/projects/${projectId}/flow-status`);
  }

  public async deleteProject(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' });
  }

  // --- DATASETS ---
  public async uploadDatasets(projectId: string, files: File[]): Promise<{ datasets: Dataset[] }> {
    const formData = new FormData();
    formData.append('proyecto_id', projectId);
    files.forEach(f => formData.append('archivos', f));

    return this.request<{ datasets: Dataset[] }>('/datasets/upload', {
      method: 'POST',
      body: formData
    });
  }

  public async listDatasets(projectId: string): Promise<{ datasets: Dataset[] }> {
    return this.request<{ datasets: Dataset[] }>(`/datasets/by-project/${projectId}`);
  }

  public async getDatasetPreview(datasetId: string, page = 1, pageSize = 50, search = ''): Promise<{
    dataset: Dataset;
    headers: string[];
    rows: Record<string, any>[];
    pagination: { page: number; pageSize: number; totalRows: number; totalPages: number };
  }> {
    return this.request(`/datasets/${datasetId}/preview?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`);
  }

  public async deleteDataset(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/datasets/${id}`, { method: 'DELETE' });
  }

  // --- MAPPINGS ---
  public async getComparison(projectId: string): Promise<{
    rubro: RubroProyecto;
    esquema_canonico: any[];
    datasets: any[];
    comparacion: any[];
    mapeos_guardados: MapeoColumna[];
  }> {
    return this.request(`/mappings/compare/${projectId}`);
  }

  public async saveMapping(data: { dataset_id: string; columna_origen: string; columna_canonica: string; tipo_destino?: string; confianza?: number }): Promise<{ mapping: MapeoColumna }> {
    return this.request<{ mapping: MapeoColumna }>('/mappings/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async saveBatchMappings(mapeos: { dataset_id: string; columna_origen: string; columna_canonica: string; tipo_destino?: string; confianza?: number }[]): Promise<{ mapeos: MapeoColumna[] }> {
    return this.request<{ mapeos: MapeoColumna[] }>('/mappings/save-batch', {
      method: 'POST',
      body: JSON.stringify({ mapeos })
    });
  }

  // --- TRANSFORMATIONS & CLEANING ---
  public async listTransformations(datasetId: string): Promise<{ transformaciones: TransformacionDataset[] }> {
    return this.request<{ transformaciones: TransformacionDataset[] }>(`/transformations/by-dataset/${datasetId}`);
  }

  public async applyTransformation(data: {
    dataset_id: string;
    tipo_transformacion: string;
    columna?: string;
    configuracion?: Record<string, any>;
  }): Promise<{
    transformacion: TransformacionDataset;
    resumen_accion: string;
    filas_antes: number;
    filas_despues: number;
    filas_afectadas: number;
  }> {
    return this.request('/transformations/apply', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async deleteTransformation(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/transformations/${id}`, { method: 'DELETE' });
  }

  // --- FUSION ---
  public async executeFusion(projectId: string): Promise<{
    fusion: DatasetFusionado;
    filas_totales: number;
    muestra_filas: Record<string, any>[];
  }> {
    return this.request('/fusion/execute', {
      method: 'POST',
      body: JSON.stringify({ proyecto_id: projectId })
    });
  }

  public async getLatestFusion(projectId: string): Promise<{ fusion: DatasetFusionado }> {
    return this.request<{ fusion: DatasetFusionado }>(`/fusion/latest/${projectId}`);
  }

  // --- ANALYTICS ---
  public async getDashboard(projectId: string): Promise<any> {
    return this.request(`/analytics/dashboard/${projectId}`);
  }

  // --- OPPORTUNITIES ---
  public async listOpportunities(projectId: string): Promise<{ oportunidades: Oportunidad[] }> {
    return this.request<{ oportunidades: Oportunidad[] }>(`/opportunities/by-project/${projectId}`);
  }

  public async createOpportunity(data: {
    proyecto_id: string;
    titulo: string;
    descripcion: string;
    evidencia: string;
    metrica_detectada?: string;
    impacto_estimado?: string;
  }): Promise<{ oportunidad: Oportunidad }> {
    return this.request<{ oportunidad: Oportunidad }>('/opportunities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updateOpportunityStatus(id: string, nuevo_estado: string, notas_revision?: string): Promise<{ oportunidad: Oportunidad }> {
    return this.request<{ oportunidad: Oportunidad }>(`/opportunities/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ nuevo_estado, notas_revision })
    });
  }

  // --- ADAPTIVE OPERATIONAL MODULES ---
  public async listModules(): Promise<{ modulos: ModuloOperativo[] }> {
    return this.request<{ modulos: ModuloOperativo[] }>('/modules');
  }

  public async listSubmodules(moduleId: string): Promise<{ submodulos: SubmoduloOperativo[] }> {
    return this.request<{ submodulos: SubmoduloOperativo[] }>(`/modules/${moduleId}/submodules`);
  }

  public async listDynamicFields(submoduleId: string): Promise<{ campos: CampoDinamico[] }> {
    return this.request<{ campos: CampoDinamico[] }>(`/modules/submodules/${submoduleId}/fields`);
  }

  public async listOperationalRecords(submoduleId: string): Promise<{ registros: RegistroOperativo[] }> {
    return this.request<{ registros: RegistroOperativo[] }>(`/modules/submodules/${submoduleId}/records`);
  }

  public async createOperationalRecord(submoduleId: string, datos: Record<string, any>): Promise<{ registro: RegistroOperativo }> {
    return this.request<{ registro: RegistroOperativo }>(`/modules/submodules/${submoduleId}/records`, {
      method: 'POST',
      body: JSON.stringify({ datos })
    });
  }

  public async updateOperationalRecord(id: string, datos: Record<string, any>): Promise<{ registro: RegistroOperativo }> {
    return this.request<{ registro: RegistroOperativo }>(`/modules/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ datos })
    });
  }

  public async deleteOperationalRecord(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/modules/records/${id}`, { method: 'DELETE' });
  }

  // --- REPORTS & AUDIT ---
  public async getExecutiveReport(projectId: string): Promise<any> {
    return this.request(`/reports/executive/${projectId}`);
  }

  public async getAuditLogs(): Promise<{ logs: AuditoriaLog[] }> {
    return this.request<{ logs: AuditoriaLog[] }>('/audit/logs');
  }
}

export const api = new ApiService();
