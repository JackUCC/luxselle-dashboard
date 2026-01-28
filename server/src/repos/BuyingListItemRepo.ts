import { BuyingListItemSchema } from '@shared/schemas'
import type { BuyingListItem } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class BuyingListItemRepo extends BaseRepo<BuyingListItem> {
  constructor() {
    super('buying_list_items', BuyingListItemSchema)
  }
}
