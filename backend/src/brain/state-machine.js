export const LaunchStates = {
  DRAFT: 'Draft',
  IMPORTED: 'Imported',
  ANALYZED: 'Analyzed',
  REVIEWED: 'Reviewed',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  OPTIMIZING: 'Optimizing',
  ARCHIVED: 'Archived'
};

const PermittedTransitions = {
  [LaunchStates.DRAFT]: [LaunchStates.IMPORTED, LaunchStates.ANALYZED],
  [LaunchStates.IMPORTED]: [LaunchStates.ANALYZED],
  [LaunchStates.ANALYZED]: [LaunchStates.REVIEWED],
  [LaunchStates.REVIEWED]: [LaunchStates.APPROVED, LaunchStates.DRAFT],
  [LaunchStates.APPROVED]: [LaunchStates.PUBLISHED, LaunchStates.REVIEWED],
  [LaunchStates.PUBLISHED]: [LaunchStates.OPTIMIZING, LaunchStates.ARCHIVED],
  [LaunchStates.OPTIMIZING]: [LaunchStates.ARCHIVED, LaunchStates.PUBLISHED],
  [LaunchStates.ARCHIVED]: [LaunchStates.DRAFT] // Allows recovery
};

export class LaunchStateMachine {
  /**
   * Validates if transition from current to target state is permitted.
   * @param {string} fromState 
   * @param {string} toState 
   * @returns {boolean} True if allowed
   */
  canTransition(fromState, toState) {
    if (!fromState || !toState) return false;
    const allowed = PermittedTransitions[fromState] || [];
    return allowed.includes(toState);
  }

  /**
   * Asserts and enforces a transition. Throws if invalid.
   */
  transition(fromState, toState) {
    if (!this.canTransition(fromState, toState)) {
      throw new Error(`Transición de estado no permitida: de '${fromState}' a '${toState}'`);
    }
    return toState;
  }
}
