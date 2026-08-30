import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { Usuario, PermisoAccion, RolUsuario } from '../types.ts';
import { dbRepository } from '../db/repository.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_dexter_super_secure_jwt_secret_key_2026';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  rol: RolUsuario;
  empresaId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: Usuario;
  userPermissions?: PermisoAccion[];
}

export class AuthService {
  public static hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  public static comparePassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  public static generateToken(user: Usuario): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      rol: user.rol,
      empresaId: user.empresa_id
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  public static verifyToken(token: string): AuthTokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch {
      return null;
    }
  }
}

// Middleware: Authenticate request via Authorization header
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = AuthService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  const user = dbRepository.findUserById(payload.userId);
  if (!user || user.estado !== 'activo') {
    return res.status(403).json({ error: 'Usuario no encontrado o cuenta inactiva.' });
  }

  req.user = user;
  req.userPermissions = dbRepository.getUserPermissions(user.id, user.empresa_id);
  next();
};

// Middleware: Require specific granular permission or admin/owner role
export const requirePermission = (permission: PermisoAccion) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Admins and owners have full access
    if (req.user.rol === 'administrador' || req.user.rol === 'propietario_empresa') {
      return next();
    }

    const hasPerm = req.userPermissions?.includes(permission);
    if (!hasPerm) {
      return res.status(403).json({
        error: `Acceso denegado: Se requiere el permiso "${permission}" para ejecutar esta acción.`
      });
    }

    next();
  };
};

// Middleware: Require specific role
export const requireRole = (...roles: RolUsuario[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (req.user.rol === 'administrador') return next();

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado: Se requiere uno de los roles [${roles.join(', ')}]`
      });
    }

    next();
  };
};
