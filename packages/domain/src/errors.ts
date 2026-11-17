export type DomainErrorCode =
  | 'SEASON_INACTIVE'
  | 'CARD_NOT_IN_HAND'
  | 'CARD_NOT_IN_DECK'
  | 'CARD_OWNERSHIP_MISMATCH'
  | 'CARD_SEASON_MISMATCH'
  | 'HAND_LIMIT_REACHED'
  | 'TARGET_REQUIRED'
  | 'UNEXPECTED_TARGET'
  | 'INVALID_RETURN_MOVEMENT'
  | 'MOVEMENT_ALREADY_RETURNED'
  | 'ALREADY_DISTRIBUTED_THIS_WEEK';

export class DomainRuleError extends Error {
  public readonly code: DomainErrorCode;

  public constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainRuleError';
    this.code = code;
  }
}
