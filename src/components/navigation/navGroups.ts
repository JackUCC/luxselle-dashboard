import type { AppNavSection } from '../layout/routeMeta'

/** Navigation section groups shared by DockBar and MobileNavDrawer. */
export const NAV_GROUPS: ReadonlyArray<{ title: string; section: AppNavSection }> = [
  { title: 'Intelligence', section: 'check' },
  { title: 'Operations', section: 'manage' },
]
