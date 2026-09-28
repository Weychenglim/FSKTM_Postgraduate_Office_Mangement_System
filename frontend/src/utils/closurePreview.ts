import type { ClosureApproval, ClosurePreview } from '../types/marks';
/** Keeps an accepted preview bound to its fetch generation until confirmation. */
export class ClosurePreviewSession {
  private generation = 0;
  private accepted: ClosurePreview | null = null;
  begin(): number { this.invalidate(); return this.generation; }
  invalidate(): void { this.generation += 1; this.accepted = null; }
  accept(generation: number, preview: ClosurePreview): boolean {
    if (generation !== this.generation) return false;
    this.accepted = preview;
    return true;
  }
  approval(preview: ClosurePreview, acknowledged: boolean): ClosureApproval | null {
    if (this.accepted !== preview || !preview.previewToken || (preview.requiresAcknowledgement && !acknowledged)) return null;
    return { previewToken: preview.previewToken, acknowledgeUnfinished: acknowledged };
  }
}
