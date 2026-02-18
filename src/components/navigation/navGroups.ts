import type { AppNavSection } from '../layout/routeMeta'

/** Navigation section groups shared by MobileNavDrawer and WideScreenSideRail. */
export const NAV_GROUPS: ReadonlyArray<{ title: string; section: AppNavSection }> = [
    { title: '', section: 'main' },
    { title: 'Admin tools', section: 'admin' },
    { title: 'Extra tools', section: 'extra' },
]
