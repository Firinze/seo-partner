/**
 * Contract: Patch Proposal & AST In-Place Engine
 * Enforces the rule: "Jamais de modification directe, on propose juste et si c'est valide l'IDE fait l'implementation"
 */

import type {
  AstPatchProposal,
  PatchOperationType,
  PatchProposalStatus,
} from '../types/domain.js';

export interface PatchMetadataChange {
  field: string;
  before?: string | null;
  after: string;
}

export interface DetailedAstPatchProposal extends AstPatchProposal {
  framework: string;
  unifiedDiff: string;
  metadataChanges: PatchMetadataChange[];
}

export interface PatchEvaluationResult {
  canMergeInPlace: boolean;
  hasComplexDynamicLogic: boolean;
  proposal: DetailedAstPatchProposal;
  warning?: string;
}

export interface IPatchProposalService {
  /**
   * Analyse an existing source file and draft an in-place AST modification proposal.
   * Does NOT touch the disk file.
   */
  generateProposal(filePath: string, targetMetadata: Record<string, unknown>): Promise<PatchEvaluationResult>;

  /**
   * Apply an accepted proposal to disk in-place.
   * Fails if status is not 'accepted'.
   */
  applyProposal(proposalId: string): Promise<{ success: boolean; modifiedFile: string }>;
}


