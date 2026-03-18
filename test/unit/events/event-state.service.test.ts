import { EventStatus } from '@/src/modules/events/domain/enums/event-status.enum';
import { EventStateService } from '@/src/modules/events/domain/services/event-state.service';

describe('EventStateService', () => {
  let service: EventStateService;

  beforeEach(() => {
    service = new EventStateService();
  });

  describe('canTransition', () => {
    it('allows PENDING → AUTHORIZED', () => {
      expect(service.canTransition(EventStatus.PENDING, EventStatus.AUTHORIZED)).toBe(true);
    });

    it('prevents PENDING → SIGNED', () => {
      expect(service.canTransition(EventStatus.PENDING, EventStatus.SIGNED)).toBe(false);
    });

    it('allows AUTHORIZED → SIGNED', () => {
      expect(service.canTransition(EventStatus.AUTHORIZED, EventStatus.SIGNED)).toBe(true);
    });

    it('allows AUTHORIZED → REJECTED', () => {
      expect(
        service.canTransition(EventStatus.AUTHORIZED, EventStatus.REJECTED),
      ).toBe(true);
    });

    it('allows SIGNED → COMPLETED', () => {
      expect(service.canTransition(EventStatus.SIGNED, EventStatus.COMPLETED)).toBe(true);
    });

    it('allows SIGNED → REJECTED', () => {
      expect(service.canTransition(EventStatus.SIGNED, EventStatus.REJECTED)).toBe(true);
    });

    it('prevents REJECTED → any state', () => {
      expect(service.canTransition(EventStatus.REJECTED, EventStatus.COMPLETED)).toBe(false);
      expect(service.canTransition(EventStatus.REJECTED, EventStatus.AUTHORIZED)).toBe(false);
    });

    it('prevents COMPLETED → any state', () => {
      expect(service.canTransition(EventStatus.COMPLETED, EventStatus.REJECTED)).toBe(false);
      expect(service.canTransition(EventStatus.COMPLETED, EventStatus.AUTHORIZED)).toBe(false);
    });
  });

  describe('getValidNextStates', () => {
    it('returns [AUTHORIZED] for PENDING', () => {
      expect(service.getValidNextStates(EventStatus.PENDING)).toEqual([EventStatus.AUTHORIZED]);
    });

    it('returns [SIGNED, REJECTED] for AUTHORIZED', () => {
      const expected = [EventStatus.SIGNED, EventStatus.REJECTED];
      expect(service.getValidNextStates(EventStatus.AUTHORIZED)).toEqual(expected);
    });

    it('returns [COMPLETED, REJECTED] for SIGNED', () => {
      const expected = [EventStatus.COMPLETED, EventStatus.REJECTED];
      expect(service.getValidNextStates(EventStatus.SIGNED)).toEqual(expected);
    });

    it('returns [] for COMPLETED and REJECTED', () => {
      expect(service.getValidNextStates(EventStatus.COMPLETED)).toEqual([]);
      expect(service.getValidNextStates(EventStatus.REJECTED)).toEqual([]);
    });
  });

  describe('canLoadDocuments', () => {
    it('allows loading documents only in SIGNED state (CU-05)', () => {
      expect(service.canLoadDocuments(EventStatus.SIGNED)).toBe(true);
    });

    it('prevents loading documents in any other state', () => {
      expect(service.canLoadDocuments(EventStatus.PENDING)).toBe(false);
      expect(service.canLoadDocuments(EventStatus.AUTHORIZED)).toBe(false);
      expect(service.canLoadDocuments(EventStatus.COMPLETED)).toBe(false);
      expect(service.canLoadDocuments(EventStatus.REJECTED)).toBe(false);
    });
  });

  describe('canBeRevoked', () => {
    it('allows revocation from AUTHORIZED, SIGNED, COMPLETED', () => {
      expect(service.canBeRevoked(EventStatus.AUTHORIZED)).toBe(true);
      expect(service.canBeRevoked(EventStatus.SIGNED)).toBe(true);
      expect(service.canBeRevoked(EventStatus.COMPLETED)).toBe(true);
    });

    it('prevents revocation from PENDING and REJECTED', () => {
      expect(service.canBeRevoked(EventStatus.PENDING)).toBe(false);
      expect(service.canBeRevoked(EventStatus.REJECTED)).toBe(false);
    });
  });

  describe('canGenerateComplementary', () => {
    it('allows complementary generation from SIGNED and COMPLETED', () => {
      expect(service.canGenerateComplementary(EventStatus.SIGNED)).toBe(true);
      expect(service.canGenerateComplementary(EventStatus.COMPLETED)).toBe(true);
    });

    it('prevents complementary generation from other states', () => {
      expect(service.canGenerateComplementary(EventStatus.PENDING)).toBe(false);
      expect(service.canGenerateComplementary(EventStatus.AUTHORIZED)).toBe(false);
      expect(service.canGenerateComplementary(EventStatus.REJECTED)).toBe(false);
    });
  });
});
