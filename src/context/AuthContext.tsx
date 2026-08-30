import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, Empresa, PermisoAccion, RolUsuario } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: Usuario | null;
  empresa: Empresa | null;
  permissions: PermisoAccion[];
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: { nombre: string; email: string; password: string; nombre_empresa?: string }) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: PermisoAccion) => boolean;
  switchRoleQuickLogin: (role: RolUsuario) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [permissions, setPermissions] = useState<PermisoAccion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setEmpresa(res.empresa);
          setPermissions(res.permissions || []);
        } catch (err) {
          console.warn('Sesión expirada o token inválido:', err);
          api.logout();
          setUser(null);
          setEmpresa(null);
          setPermissions([]);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, pass);
      setUser(res.user);
      setEmpresa(res.empresa);
      setPermissions(res.permissions || []);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { nombre: string; email: string; password: string; nombre_empresa?: string }) => {
    setLoading(true);
    try {
      const res = await api.register(data);
      setUser(res.user);
      setEmpresa(res.empresa);
      setPermissions(res.permissions || []);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setEmpresa(null);
    setPermissions([]);
  };

  const hasPermission = (perm: PermisoAccion): boolean => {
    if (!user) return false;
    if (user.rol === 'administrador' || user.rol === 'propietario_empresa') return true;
    return permissions.includes(perm);
  };

  const switchRoleQuickLogin = async (role: RolUsuario) => {
    const credentialsMap: Record<RolUsuario, { email: string; pass: string }> = {
      administrador: { email: 'admin@crmdexter.com', pass: 'DexterAdmin2026!' },
      propietario_empresa: { email: 'propietario@dexter.com', pass: 'Propietario2026!' },
      analista: { email: 'analista@dexter.com', pass: 'Analista2026!' },
      usuario_operativo: { email: 'operativo@dexter.com', pass: 'Operativo2026!' }
    };
    const creds = credentialsMap[role];
    if (creds) {
      await login(creds.email, creds.pass);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        empresa,
        permissions,
        loading,
        login,
        register,
        logout,
        hasPermission,
        switchRoleQuickLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
