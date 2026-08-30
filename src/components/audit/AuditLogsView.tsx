import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  User,
  Activity,
  Database,
  Filter,
  Search,
  CheckCircle2,
  FileCode2
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { AuditoriaLog } from '../../types/index.ts';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      setLogs(res.logs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      l.accion.toLowerCase().includes(term) ||
      (l.usuario_nombre && l.usuario_nombre.toLowerCase().includes(term)) ||
      l.entidad.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            Registro de Auditoría & Trazabilidad de Acciones
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Historial inmutable de todas las operaciones, transformaciones y accesos en la plataforma
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuario o acción..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Eventos Registrados ({filteredLogs.length})
          </h3>
        </div>

        <div className="overflow-x-auto max-h-[520px] custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Cargando bitácora de auditoría...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No se encontraron eventos registrados.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Fecha y Hora</th>
                  <th className="py-2.5 px-4">Usuario</th>
                  <th className="py-2.5 px-4">Acción</th>
                  <th className="py-2.5 px-4">Entidad</th>
                  <th className="py-2.5 px-4">Detalles Técnicos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(l.creado_en).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {l.usuario_nombre || 'Sistema'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        {l.accion}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">
                      {l.entidad.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500 truncate max-w-xs" title={JSON.stringify(l.detalles)}>
                      {JSON.stringify(l.detalles)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
