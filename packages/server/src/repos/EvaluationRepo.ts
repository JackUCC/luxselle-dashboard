/** Evaluations (e.g. buy-box) collection. @see docs/CODE_REFERENCE.md */
import { EvaluationSchema } from '@shared/schemas'
import type { Evaluation } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class EvaluationRepo extends BaseRepo<Evaluation> {
  constructor() {
    super('evaluations', EvaluationSchema)
  }
}
