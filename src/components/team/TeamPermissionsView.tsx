import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  X,
  Building,
  Mail,
  Lock,
  User,
  Save
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Usuario, PermisoAccion, RolUsuario } from '../../types/index.ts';

export const TeamPermissionsView: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [userPerms, setUserPerms] = useState<PermisoAccion[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteNombre, setInviteNombre] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRol, setInviteRol] = useState<RolUsuario>('analista');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const availablePermissions: { id: PermisoAccion; label: string; desc: string }[] = [
    { id: 'ver_datos', label: 'Ver Datos y Previsualizaciones', desc: 'Permite explorar datasets y tablas' },
    { id: 'analizar_datos', label: 'Analizar y Configurar Mapeo Semántico', desc: 'Acceso a comparaciones y mapeo IA' },
    { id: 'subir_datasets', label: 'Subir y Eliminar Datasets', desc: 'Carga de archivos CSV y XLSX' },
    { id: 'limpiar_datos', label: 'Limpiar y Transformar Datos', desc: 'Aplicación de transformaciones y reglas' },
    { id: 'procesar_datasets', label: 'Ejecutar Motor de Fusión Master', desc: 'Consolidación de archivos Parquet' },
    { id: 'crear_oportunidades', label: 'Crear Oportunidades de Negocio', desc: 'Registro de iniciativas con evidencia' },
    { id: 'proponer_cambios', label: 'Proponer Modificaciones', desc: 'Envío de ajustes a revisión' },
    { id: 'aprobar_cambios', label: 'Aprobar Oportunidades y Cambios', desc: 'Aprobación formal de iniciativas' },
    { id: 'modificar_ofertas', label: 'Modificar Ofertas Comerciales', desc: 'Edición en tablas adaptativas' },
    { id: 'modificar_campanas', label: 'Modificar Campañas', desc: 'Edición en submódulos operativos' },
    { id: 'administrar_usuarios', label: 'Administrar Equipo y Permisos', desc: 'Gestión de roles y accesos' }
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.listUsers();
      setUsers(res.users);
      if (res.users.length > 0) {
        const u = selectedUser || res.users[0];
        setSelectedUser(u);
        setUserPerms(u.permisos || []);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectUser = (u: Usuario) => {
    setSelectedUser(u);
    setUserPerms(u.permisos || []);
    setSavedSuccess(false);
  };

  const handleTogglePerm = (perm: PermisoAccion) => {
    setUserPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSavingPerms(true);
    setSavedSuccess(false);

    try {
      await api.updatePermissions(selectedUser.id, userPerms);
      setSavedSuccess(true);
      await fetchUsers();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error al guardar permisos');
    } finally {
      setSavingPerms(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);

    try {
      const res = await api.inviteUser({
        nombre: inviteNombre.trim(),
        email: inviteEmail.trim(),
        rol: inviteRol
      });
      setInviteResult(res.mensaje);
      setInviteNombre('');
      setInviteEmail('');
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error al invitar usuario');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            Gestión de Equipo & Matriz de Permisos (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administra roles jerárquicos y permisos granulares por acción en la empresa
          </p>
        </div>

        {(user?.rol === 'administrador' || user?.rol === 'propietario_empresa') && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invitar Usuario</span>
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Permisos granulares actualizados y aplicados con éxito.</span>
        </div>
      )}

      {/* Main Grid: User List (Left) + Permissions Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Users List */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Miembros de la Organización ({users.length})
          </h3>

          <div className="space-y-2">
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">{u.nombre}</p>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {u.rol.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{u.email}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Cols: Granular Permissions Matrix */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          {selectedUser ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Permisos de: <span className="text-sky-600">{selectedUser.nombre}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rol Asignado: <strong className="capitalize">{selectedUser.rol.replace('_', ' ')}</strong>
                  </p>
                </div>

                <button
                  onClick={handleSavePermissions}
                  disabled={savingPerms}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingPerms ? 'Guardando...' : 'Guardar Permisos'}</span>
                </button>
              </div>

              {selectedUser.rol === 'administrador' || selectedUser.rol === 'propietario_empresa' ? (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
                  <span>Este rol cuenta con acceso y autorizaciones totales por defecto en el sistema.</span>
                </div>
              ) : null}

              <div className="space-y-2.5">
                {availablePermissions.map((perm) => {
                  const isChecked = userPerms.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked ? 'border-sky-300 bg-sky-50/30' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePerm(perm.id)}
                        className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-slate-800">{perm.label}</p>
                        <p className="text-[11px] text-slate-500">{perm.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Selecciona un usuario para configurar sus permisos.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Invite User */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Invitar Miembro al Equipo</h3>
                  <p className="text-xs text-slate-500">Asigna credenciales y rol de trabajo</p>
                </div>
              </div>
              <button
                onClick={() => { setIsInviteOpen(false); setInviteResult(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteResult && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
                {inviteResult}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={inviteNombre}
                  onChange={(e) => setInviteNombre(e.target.value)}
                  placeholder="Ej. Carmen Ortiz"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico Corporativo *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="carmen@empresa.com"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Rol de Acceso *
                </label>
                <select
                  value={inviteRol}
                  onChange={(e) => setInviteRol(e.target.value as RolUsuario)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white"
                >
                  <option value="analista">Analista de Datos (Limpieza, Fusión y Mapeo)</option>
                  <option value="usuario_operativo">Usuario Operativo (Tablas y Registros)</option>
                  <option value="propietario_empresa">Propietario / Gestor de Proyectos</option>
                  <option value="administrador">Administrador Total</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Invitando...' : 'Enviar Invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
