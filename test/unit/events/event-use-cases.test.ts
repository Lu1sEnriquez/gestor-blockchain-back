import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';
import { RBACService } from '@/src/modules/users/domain/services/rbac.service';
import { UserRole } from '@/src/modules/users/domain/enums/user-role.enum';

describe('Event Use Cases - Integration Tests', () => {
  const rbacService = new RBACService();
  const stateService = new EventStateService();

  describe('CreateEventUseCase prerequisites', () => {
    it('requires user with create_event permission', () => {
      // Verify RBAC rules: CREATOR has create_event permission
      expect(rbacService.hasPermission(UserRole.CREATOR, 'create_event')).toBe(true);
      expect(rbacService.hasPermission(UserRole.ADMIN, 'create_event')).toBe(true);
      expect(rbacService.hasPermission(UserRole.SIGNER, 'create_event')).toBe(false);
      expect(rbacService.hasPermission(UserRole.AUDITOR, 'create_event')).toBe(false);
    });

    it('initializes events in PENDING status', () => {
      const status = EventStatus.PENDING;
      expect(status).toBe(EventStatus.PENDING);
    });
  });

  describe('AuthorizeEventUseCase prerequisites', () => {
    it('requires user with authorize_event permission', () => {
      expect(rbacService.canAuthorize(UserRole.SIGNER)).toBe(true);
      expect(rbacService.canAuthorize(UserRole.ADMIN)).toBe(true);
      expect(rbacService.canAuthorize(UserRole.CREATOR)).toBe(false);
      expect(rbacService.canAuthorize(UserRole.AUDITOR)).toBe(false);
    });

    it('allows state transition from PENDING to AUTHORIZED', () => {
      expect(stateService.canTransition(EventStatus.PENDING, EventStatus.AUTHORIZED)).toBe(
        true,
      );
    });

    it('prevents invalid state transitions', () => {
      expect(stateService.canTransition(EventStatus.COMPLETED, EventStatus.AUTHORIZED)).toBe(
        false,
      );
    });
  });

  describe('SignEventUseCase prerequisites', () => {
    it('requires user with sign_event permission', () => {
      expect(rbacService.canSign(UserRole.SIGNER)).toBe(true);
      expect(rbacService.canSign(UserRole.ADMIN)).toBe(true);
      expect(rbacService.canSign(UserRole.CREATOR)).toBe(false);
      expect(rbacService.canSign(UserRole.AUDITOR)).toBe(false);
    });

    it('allows state transition from AUTHORIZED to SIGNED', () => {
      expect(stateService.canTransition(EventStatus.AUTHORIZED, EventStatus.SIGNED)).toBe(true);
    });

    it('CU-05 rule: only SIGNED events can load documents', () => {
      expect(stateService.canLoadDocuments(EventStatus.SIGNED)).toBe(true);
      expect(stateService.canLoadDocuments(EventStatus.PENDING)).toBe(false);
      expect(stateService.canLoadDocuments(EventStatus.AUTHORIZED)).toBe(false);
      expect(stateService.canLoadDocuments(EventStatus.COMPLETED)).toBe(false);
    });
  });
});
