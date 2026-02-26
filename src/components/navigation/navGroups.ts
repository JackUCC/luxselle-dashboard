import type { AppNavSection } from '../layout/routeMeta'

/** Navigation section groups shared by MobileNavDrawer and WideScreenSideRail. */
export const NAV_GROUPS: ReadonlyArray<{ title: string; section: AppNavSection }> = [
  { title: 'Check', section: 'check' },
  { title: 'Manage', section: 'manage' },
  { title: 'Finance', section: 'finance' },
  { title: 'Tools', section: 'tools' },
]
