import type { AppNavSection } from '../layout/routeMeta'

/** Navigation section groups shared by MobileNavDrawer and WideScreenSideRail. */
export const NAV_GROUPS: ReadonlyArray<{ title: string; section: AppNavSection }> = [
    { title: 'Core', section: 'core' },
    { title: 'Tools', section: 'tools' },
]
