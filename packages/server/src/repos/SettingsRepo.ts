/** Org/user settings collection. @see docs/CODE_REFERENCE.md */
import { DEFAULT_ORG_ID, SettingsSchema } from '@shared/schemas'
import type { Settings } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class SettingsRepo extends BaseRepo<Settings> {
  constructor() {
    super('settings', SettingsSchema)
  }

  async getSettings() {
    return this.getById(DEFAULT_ORG_ID)
  }

  async upsertSettings(data: Settings) {
    const existing = await this.getById(DEFAULT_ORG_ID)
    if (existing) {
      return this.set(DEFAULT_ORG_ID, data)
    }
    const parsed = SettingsSchema.parse(data)
    const collection = this.getCollection()
    await collection.doc(DEFAULT_ORG_ID).set(parsed)
    return { id: DEFAULT_ORG_ID, ...parsed }
  }
}
