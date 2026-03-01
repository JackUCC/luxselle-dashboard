import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

const initializeAppMock = vi.fn()
const getAppsMock = vi.fn()
const certMock = vi.fn()
const getFirestoreMock = vi.fn()
const getStorageMock = vi.fn()
const firestoreSettingsMock = vi.fn()

vi.mock('firebase-admin/app', () => ({
  initializeApp: initializeAppMock,
  getApps: getAppsMock,
  cert: certMock,
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: getFirestoreMock,
}))

vi.mock('firebase-admin/storage', () => ({
  getStorage: getStorageMock,
}))

describe('firebase config credential strategy', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV }

    delete (globalThis as Record<string, boolean>).__luxselle_firestore_settings_applied

    initializeAppMock.mockReturnValue({ name: 'app' })
    getAppsMock.mockReturnValue([])
    certMock.mockImplementation((value) => ({ wrapped: value }))
    firestoreSettingsMock.mockImplementation(() => undefined)
    getFirestoreMock.mockReturnValue({ settings: firestoreSettingsMock })
    getStorageMock.mockReturnValue({ bucket: vi.fn() })
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  it('uses GOOGLE_APPLICATION_CREDENTIALS_JSON with cert(parsedJson)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    vi.doMock('./env', () => ({
      env: {
        FIREBASE_USE_EMULATOR: false,
        FIREBASE_PROJECT_ID: 'luxselle-dashboard',
        FIREBASE_STORAGE_BUCKET: 'luxselle-dashboard.firebasestorage.app',
        FIRESTORE_DATABASE_ID: undefined,
        FIRESTORE_EMULATOR_HOST: undefined,
        FIREBASE_STORAGE_EMULATOR_HOST: undefined,
        GOOGLE_APPLICATION_CREDENTIALS_JSON: JSON.stringify({
          project_id: 'luxselle-dashboard',
          client_email: 'firebase-adminsdk@luxselle.iam.gserviceaccount.com',
          private_key: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n',
        }),
        GOOGLE_APPLICATION_CREDENTIALS: undefined,
      },
    }))

    await import('./firebase')

    expect(certMock).toHaveBeenCalledTimes(1)
    expect(certMock).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'luxselle-dashboard',
        client_email: 'firebase-adminsdk@luxselle.iam.gserviceaccount.com',
      }),
    )
    expect(initializeAppMock).toHaveBeenCalledWith(
      expect.objectContaining({
        credential: expect.any(Object),
        projectId: 'luxselle-dashboard',
      }),
    )
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('credentialStrategy: service-account-json'))
  })

  it('uses ADC for GOOGLE_APPLICATION_CREDENTIALS path and does not call cert(path)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    vi.doMock('./env', () => ({
      env: {
        FIREBASE_USE_EMULATOR: false,
        FIREBASE_PROJECT_ID: 'luxselle-dashboard',
        FIREBASE_STORAGE_BUCKET: 'luxselle-dashboard.firebasestorage.app',
        FIRESTORE_DATABASE_ID: undefined,
        FIRESTORE_EMULATOR_HOST: undefined,
        FIREBASE_STORAGE_EMULATOR_HOST: undefined,
        GOOGLE_APPLICATION_CREDENTIALS_JSON: undefined,
        GOOGLE_APPLICATION_CREDENTIALS: '/tmp/service-account.json',
      },
    }))

    await import('./firebase')

    expect(certMock).not.toHaveBeenCalled()
    expect(initializeAppMock).toHaveBeenCalledTimes(1)
    const initOptions = initializeAppMock.mock.calls[0]?.[0]
    expect(initOptions).not.toHaveProperty('credential')
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('credentialStrategy: application-default-env-path'))
  })

  it('uses emulator strategy when FIREBASE_USE_EMULATOR=true', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    vi.doMock('./env', () => ({
      env: {
        FIREBASE_USE_EMULATOR: true,
        FIREBASE_PROJECT_ID: 'luxselle-dashboard',
        FIREBASE_STORAGE_BUCKET: 'luxselle-dashboard.firebasestorage.app',
        FIRESTORE_DATABASE_ID: undefined,
        FIRESTORE_EMULATOR_HOST: undefined,
        FIREBASE_STORAGE_EMULATOR_HOST: undefined,
        GOOGLE_APPLICATION_CREDENTIALS_JSON: undefined,
        GOOGLE_APPLICATION_CREDENTIALS: undefined,
      },
    }))

    await import('./firebase')

    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8082')
    expect(process.env.FIREBASE_STORAGE_EMULATOR_HOST).toBe('127.0.0.1:9198')
    expect(certMock).not.toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('credentialStrategy: emulator'))
  })

  it('falls back to ADC when no credentials are provided', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    vi.doMock('./env', () => ({
      env: {
        FIREBASE_USE_EMULATOR: false,
        FIREBASE_PROJECT_ID: 'luxselle-dashboard',
        FIREBASE_STORAGE_BUCKET: 'luxselle-dashboard.firebasestorage.app',
        FIRESTORE_DATABASE_ID: undefined,
        FIRESTORE_EMULATOR_HOST: undefined,
        FIREBASE_STORAGE_EMULATOR_HOST: undefined,
        GOOGLE_APPLICATION_CREDENTIALS_JSON: undefined,
        GOOGLE_APPLICATION_CREDENTIALS: undefined,
      },
    }))

    await import('./firebase')

    expect(certMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No Firebase credentials provided. Falling back to Application Default Credentials.'),
    )
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('credentialStrategy: application-default-fallback'))
  })
})
