import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';

describe('RBACService', () => {
  let service: RBACService;

  beforeEach(() => {
    service = new RBACService();
  });

  describe('hasPermission', () => {
    it('returns true for ADMIN with any permission', () => {
      expect(service.hasPermission(UserRole.ADMIN, 'create_user')).toBe(true);
      expect(service.hasPermission(UserRole.ADMIN, 'sign_event')).toBe(true);
      expect(service.hasPermission(UserRole.ADMIN, 'revoke_hash')).toBe(true);
    });

    it('returns true for CREATOR with create_template', () => {
      expect(service.hasPermission(UserRole.CREATOR, 'create_template')).toBe(true);
      expect(service.hasPermission(UserRole.CREATOR, 'create_event')).toBe(true);
    });

    it('returns false for CREATOR without admin permissions', () => {
      expect(service.hasPermission(UserRole.CREATOR, 'delete_user')).toBe(false);
      expect(service.hasPermission(UserRole.CREATOR, 'edit_user')).toBe(false);
    });

    it('returns true for SIGNER with authorize_event and sign_event', () => {
      expect(service.hasPermission(UserRole.SIGNER, 'authorize_event')).toBe(true);
      expect(service.hasPermission(UserRole.SIGNER, 'sign_event')).toBe(true);
    });

    it('returns false for SIGNER without create permissions', () => {
      expect(service.hasPermission(UserRole.SIGNER, 'create_event')).toBe(false);
      expect(service.hasPermission(UserRole.SIGNER, 'create_template')).toBe(false);
    });

    it('returns true for AUDITOR with audit_logs and recover_event', () => {
      expect(service.hasPermission(UserRole.AUDITOR, 'view_audit_logs')).toBe(true);
      expect(service.hasPermission(UserRole.AUDITOR, 'recover_event')).toBe(true);
    });

    it('returns false for AUDITOR without sign/authorize permissions', () => {
      expect(service.hasPermission(UserRole.AUDITOR, 'sign_event')).toBe(false);
      expect(service.hasPermission(UserRole.AUDITOR, 'authorize_event')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true if role has all permissions', () => {
      const perms = ['create_user', 'delete_user', 'sign_event'];
      expect(service.hasAllPermissions(UserRole.ADMIN, perms)).toBe(true);
    });

    it('returns false if role is missing any permission', () => {
      const perms = ['create_event', 'delete_user'];
      expect(service.hasAllPermissions(UserRole.CREATOR, perms)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true if role has at least one permission', () => {
      const perms = ['delete_user', 'create_event'];
      expect(service.hasAnyPermission(UserRole.CREATOR, perms)).toBe(true);
    });

    it('returns false if role has none of the permissions', () => {
      const perms = ['delete_user', 'edit_user'];
      expect(service.hasAnyPermission(UserRole.CREATOR, perms)).toBe(false);
    });
  });

  describe('canAuthorize', () => {
    it('allows ADMIN and SIGNER to authorize', () => {
      expect(service.canAuthorize(UserRole.ADMIN)).toBe(true);
      expect(service.canAuthorize(UserRole.SIGNER)).toBe(true);
    });

    it('prevents CREATOR and AUDITOR from authorizing', () => {
      expect(service.canAuthorize(UserRole.CREATOR)).toBe(false);
      expect(service.canAuthorize(UserRole.AUDITOR)).toBe(false);
    });
  });

  describe('canSign', () => {
    it('allows ADMIN and SIGNER to sign', () => {
      expect(service.canSign(UserRole.ADMIN)).toBe(true);
      expect(service.canSign(UserRole.SIGNER)).toBe(true);
    });

    it('prevents CREATOR and AUDITOR from signing', () => {
      expect(service.canSign(UserRole.CREATOR)).toBe(false);
      expect(service.canSign(UserRole.AUDITOR)).toBe(false);
    });
  });

  describe('canCreateTemplate', () => {
    it('allows ADMIN and CREATOR to create templates', () => {
      expect(service.canCreateTemplate(UserRole.ADMIN)).toBe(true);
      expect(service.canCreateTemplate(UserRole.CREATOR)).toBe(true);
    });

    it('prevents SIGNER and AUDITOR from creating templates', () => {
      expect(service.canCreateTemplate(UserRole.SIGNER)).toBe(false);
      expect(service.canCreateTemplate(UserRole.AUDITOR)).toBe(false);
    });
  });

  describe('canLoadDocuments', () => {
    it('allows only ADMIN to load documents', () => {
      expect(service.canLoadDocuments(UserRole.ADMIN)).toBe(true);
    });

    it('prevents other roles from loading documents', () => {
      expect(service.canLoadDocuments(UserRole.CREATOR)).toBe(false);
      expect(service.canLoadDocuments(UserRole.SIGNER)).toBe(false);
      expect(service.canLoadDocuments(UserRole.AUDITOR)).toBe(false);
    });
  });

  describe('canRevokeHash', () => {
    it('allows only ADMIN to revoke', () => {
      expect(service.canRevokeHash(UserRole.ADMIN)).toBe(true);
    });

    it('prevents other roles from revoking', () => {
      expect(service.canRevokeHash(UserRole.CREATOR)).toBe(false);
      expect(service.canRevokeHash(UserRole.SIGNER)).toBe(false);
      expect(service.canRevokeHash(UserRole.AUDITOR)).toBe(false);
    });
  });

  describe('canRecover', () => {
    it('allows ADMIN and AUDITOR to recover events', () => {
      expect(service.canRecover(UserRole.ADMIN)).toBe(true);
      expect(service.canRecover(UserRole.AUDITOR)).toBe(true);
    });

    it('prevents CREATOR and SIGNER from recovering', () => {
      expect(service.canRecover(UserRole.CREATOR)).toBe(false);
      expect(service.canRecover(UserRole.SIGNER)).toBe(false);
    });
  });
});
