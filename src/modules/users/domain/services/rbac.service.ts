import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';

/**
 * Definición de permisos por rol (RBAC granular).
 * Mapeo: rol → array de permisos atómicos que puede ejecutar.
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [
    'create_user',
    'edit_user',
    'delete_user',
    'list_users',
    'create_template',
    'edit_template',
    'create_event',
    'authorize_event',
    'sign_event',
    'generate_documents',
    'load_documents',
    'revoke_hash',
    'audit_logs',
    'recover_event',
    'recover_document',
  ],
  [UserRole.CREATOR]: [
    'create_template',
    'edit_template',
    'create_event',
    'view_audit_logs',
    'download_documents',
  ],
  [UserRole.SIGNER]: [
    'authorize_event',
    'sign_event',
    'view_audit_logs',
    'download_documents',
  ],
  [UserRole.AUDITOR]: [
    'view_audit_logs',
    'view_all_events',
    'view_all_users',
    'export_audit_trail',
    'recover_event',
    'recover_document',
  ],
};

/**
 * Servicio de dominio para gestionar control de acceso basado en roles (RBAC).
 */
export class RBACService {
  /**
   * Verifica si un rol tiene un permiso específico.
   * @param role Rol del usuario
   * @param permission Permiso a verificar
   * @returns true si el rol tiene ese permiso
   */
  hasPermission(role: UserRole, permission: string): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  }

  /**
   * Verifica si un rol tiene todos los permisos solicitados.
   */
  hasAllPermissions(role: UserRole, permissions: string[]): boolean {
    return permissions.every((permission) => this.hasPermission(role, permission));
  }

  /**
   * Verifica si un rol tiene al menos uno de los permisos solicitados.
   */
  hasAnyPermission(role: UserRole, permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(role, permission));
  }

  /**
   * Obtiene todos los permisos de un rol.
   */
  getPermissions(role: UserRole): string[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }

  /**
   * Valida si un usuario puede autorizar un evento.
   * Solo ADMIN y SIGNER pueden autorizar.
   */
  canAuthorize(role: UserRole): boolean {
    return [UserRole.ADMIN, UserRole.SIGNER].includes(role);
  }

  /**
   * Valida si un usuario puede firmar un evento.
   * Solo ADMIN y SIGNER pueden firmar.
   */
  canSign(role: UserRole): boolean {
    return [UserRole.ADMIN, UserRole.SIGNER].includes(role);
  }

  /**
   * Valida si un usuario puede crear plantillas.
   * Solo ADMIN y CREATOR pueden crear.
   */
  canCreateTemplate(role: UserRole): boolean {
    return [UserRole.ADMIN, UserRole.CREATOR].includes(role);
  }

  /**
   * Valida si un usuario puede cargar documentos masivos.
   * Solo ADMIN puede cargar.
   */
  canLoadDocuments(role: UserRole): boolean {
    return role === UserRole.ADMIN;
  }

  /**
   * Valida si un usuario puede revocar un hash.
   * Solo ADMIN puede revocar.
   */
  canRevokeHash(role: UserRole): boolean {
    return role === UserRole.ADMIN;
  }

  /**
   * Valida si un usuario puede recuperar un evento.
   * Solo ADMIN y AUDITOR pueden recuperar.
   */
  canRecover(role: UserRole): boolean {
    return [UserRole.ADMIN, UserRole.AUDITOR].includes(role);
  }
}
