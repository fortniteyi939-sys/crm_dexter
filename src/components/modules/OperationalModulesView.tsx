import React, { useState, useEffect } from 'react';
import {
  Table2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Layers,
  Calendar,
  DollarSign,
  Tag,
  X,
  Building,
  Save
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { ModuloOperativo, SubmoduloOperativo, CampoDinamico, RegistroOperativo } from '../../types/index.ts';

export const OperationalModulesView: React.FC = () => {
  const { user } = useAuth();

  const [modules, setModules] = useState<ModuloOperativo[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [submodules, setSubmodules] = useState<SubmoduloOperativo[]>([]);
  const [selectedSubmoduleId, setSelectedSubmoduleId] = useState<string>('');
  const [fields, setFields] = useState<CampoDinamico[]>([]);
  const [records, setRecords] = useState<RegistroOperativo[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states for creating/editing records
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await api.listModules();
      setModules(res.modulos);

      if (res.modulos.length > 0) {
        const firstMod = selectedModuleId || res.modulos[0].id;
        setSelectedModuleId(firstMod);
        const subRes = await api.listSubmodules(firstMod);
        setSubmodules(subRes.submodulos);

        if (subRes.submodulos.length > 0) {
          const firstSub = selectedSubmoduleId || subRes.submodulos[0].id;
          setSelectedSubmoduleId(firstSub);
          loadSubmoduleData(firstSub);
        }
      }
    } catch (err: any) {
      console.error('Error fetching modules:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmoduleData = async (subId: string) => {
    try {
      const [fieldsRes, recordsRes] = await Promise.all([
        api.listDynamicFields(subId),
        api.listOperationalRecords(subId)
      ]);
      setFields(fieldsRes.campos);
      setRecords(recordsRes.registros);
    } catch (err) {
      console.error('Error loading submodule details:', err);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleModuleChange = async (modId: string) => {
    setSelectedModuleId(modId);
    const subRes = await api.listSubmodules(modId);
    setSubmodules(subRes.submodulos);
    if (subRes.submodulos.length > 0) {
      setSelectedSubmoduleId(subRes.submodulos[0].id);
      loadSubmoduleData(subRes.submodulos[0].id);
    } else {
      setSelectedSubmoduleId('');
      setFields([]);
      setRecords([]);
    }
  };

  const handleSubmoduleChange = (subId: string) => {
    setSelectedSubmoduleId(subId);
    loadSubmoduleData(subId);
  };

  const handleOpenCreateModal = () => {
    setEditingRecordId(null);
    const initial: Record<string, any> = {};
    fields.forEach(f => {
      initial[f.nombre] = f.tipo === 'booleano' ? false : '';
    });
    setFormData(initial);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: RegistroOperativo) => {
    setEditingRecordId(rec.id);
    setFormData({ ...rec.datos });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmoduleId) return;
    setSaving(true);
    setFormError(null);

    try {
      if (editingRecordId) {
        await api.updateOperationalRecord(editingRecordId, formData);
      } else {
        await api.createOperationalRecord(selectedSubmoduleId, formData);
      }
      setIsModalOpen(false);
      loadSubmoduleData(selectedSubmoduleId);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar registro');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro operativo?')) return;
    try {
      await api.deleteOperationalRecord(id);
      loadSubmoduleData(selectedSubmoduleId);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const activeModule = modules.find(m => m.id === selectedModuleId);
  const activeSubmodule = submodules.find(s => s.id === selectedSubmoduleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Table2 className="w-5 h-5 text-sky-600" />
            Tablas Adaptativas & Módulos Operativos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestión de esquemas dinámicos para operaciones de negocio (Campañas, Ofertas y Catálogos)
          </p>
        </div>

        {selectedSubmoduleId && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Registro</span>
          </button>
        )}
      </div>

      {/* Module Selector & Submodule Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Módulo:</span>
          <div className="flex items-center space-x-2 overflow-x-auto">
            {modules.map((m) => (
              <button
                key={m.id}
                onClick={() => handleModuleChange(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedModuleId === m.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        </div>

        {submodules.length > 0 && (
          <div className="flex items-center space-x-2 border-t border-slate-100 pt-3 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submódulo:</span>
            {submodules.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSubmoduleChange(sub.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                  selectedSubmoduleId === sub.id
                    ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {sub.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold text-slate-900">
              Registros: {activeSubmodule?.nombre || 'Selecciona un submódulo'}
            </h3>
            <span className="text-[11px] text-slate-400">({records.length} registros)</span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px] custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Cargando registros...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No hay registros ingresados en este submódulo todavía.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-12 text-center text-slate-400 font-mono">#</th>
                  {fields.map((f) => (
                    <th key={f.nombre} className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-800">
                      {f.etiqueta}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {records.map((rec, rIdx) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 border-r border-slate-100 text-center text-slate-400 font-mono">
                      {rIdx + 1}
                    </td>
                    {fields.map((f) => {
                      const val = rec.datos[f.nombre];
                      return (
                        <td key={f.nombre} className="py-2.5 px-3 border-r border-slate-100 text-slate-700 font-mono">
                          {val !== undefined && val !== null && val !== '' ? (
                            f.tipo === 'moneda' ? (
                              `$${Number(val).toLocaleString()}`
                            ) : f.tipo === 'booleano' ? (
                              val ? '✅ Sí' : '❌ No'
                            ) : (
                              String(val)
                            )
                          ) : (
                            <span className="text-slate-300 italic">vacío</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(rec)}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Create/Edit Record */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
                  <Table2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRecordId ? 'Editar Registro' : 'Nuevo Registro Operativo'}
                  </h3>
                  <p className="text-xs text-slate-500">{activeSubmodule?.nombre}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveRecord} className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {fields.map((f) => (
                <div key={f.nombre}>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {f.etiqueta} {f.requerido && <span className="text-rose-500">*</span>}
                  </label>

                  {f.tipo === 'select' && f.opciones ? (
                    <select
                      value={formData[f.nombre] || ''}
                      onChange={(e) => setFormData(p => ({ ...p, [f.nombre]: e.target.value }))}
                      required={f.requerido}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                    >
                      <option value="">-- Seleccionar --</option>
                      {f.opciones.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : f.tipo === 'booleano' ? (
                    <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={Boolean(formData[f.nombre])}
                        onChange={(e) => setFormData(p => ({ ...p, [f.nombre]: e.target.checked }))}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span>Habilitado / Activo</span>
                    </label>
                  ) : (
                    <input
                      type={f.tipo === 'numero' || f.tipo === 'moneda' ? 'number' : f.tipo === 'fecha' ? 'date' : 'text'}
                      value={formData[f.nombre] ?? ''}
                      onChange={(e) => setFormData(p => ({ ...p, [f.nombre]: e.target.value }))}
                      required={f.requerido}
                      placeholder={`Ingrese ${f.etiqueta.toLowerCase()}...`}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    />
                  )}
                </div>
              ))}

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
