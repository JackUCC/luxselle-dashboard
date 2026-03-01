import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { store, mockGet, mockSet } = vi.hoisted(() => {
  const docStore = new Map<string, Record<string, unknown>>()

  return {
    store: docStore,
    mockGet: vi.fn(async (key: string) => ({
      exists: docStore.has(key),
      data: () => docStore.get(key),
    })),
    mockSet: vi.fn(async (key: string, value: Record<string, unknown>, options?: { merge?: boolean }) => {
      if (options?.merge && docStore.has(key)) {
        docStore.set(key, {
          ...(docStore.get(key) || {}),
          ...value,
        })
        return
      }

      docStore.set(key, value)
    }),
  }
})

vi.mock('../config/firebase', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn((key: string) => ({
        get: () => mockGet(key),
        set: (value: Record<string, unknown>, options?: { merge?: boolean }) =>
          mockSet(key, value, options),
      })),
    })),
  },
}))

import { idempotency } from './idempotency'

describe('idempotency middleware', () => {
  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it('replays the cached response when the same key is reused with the same request', async () => {
    const app = express()
    app.use(express.json())

    let handlerRuns = 0

    app.post('/api/checkout', idempotency, (_req, res) => {
      handlerRuns += 1
      res.status(201).json({ run: handlerRuns, ok: true })
    })

    const firstResponse = await request(app)
      .post('/api/checkout')
      .set('x-idempotency-key', 'key-1')
      .send({ amount: 100, currency: 'EUR' })

    const replayResponse = await request(app)
      .post('/api/checkout')
      .set('x-idempotency-key', 'key-1')
      .send({ amount: 100, currency: 'EUR' })

    expect(firstResponse.status).toBe(201)
    expect(replayResponse.status).toBe(201)
    expect(replayResponse.body).toEqual(firstResponse.body)
    expect(handlerRuns).toBe(1)
  })

  it('rejects key reuse when the fingerprint differs for the same idempotency key', async () => {
    const app = express()
    app.use(express.json())

    let handlerRuns = 0

    app.post('/api/checkout', idempotency, (req, res) => {
      handlerRuns += 1
      res.status(201).json({ run: handlerRuns, amount: req.body.amount })
    })

    const firstResponse = await request(app)
      .post('/api/checkout')
      .set('x-idempotency-key', 'key-2')
      .send({ amount: 100, currency: 'EUR' })

    const conflictResponse = await request(app)
      .post('/api/checkout')
      .set('x-idempotency-key', 'key-2')
      .send({ amount: 101, currency: 'EUR' })

    expect(firstResponse.status).toBe(201)
    expect(conflictResponse.status).toBe(409)
    expect(conflictResponse.body).toEqual({
      error: {
        code: 'CONFLICT',
        message:
          'Idempotency key reuse across different requests is invalid; use a new idempotency key for each unique request',
      },
    })
    expect(handlerRuns).toBe(1)
  })
})
