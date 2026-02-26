/**
 * Search API: visual similarity search (POST /api/search/visual).
 * @see docs/CODE_REFERENCE.md
 */
import { Router } from 'express'
import multer from 'multer'
import { DEFAULT_ORG_ID } from '@shared/schemas'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'
import { searchByImageBuffer, searchByImageUrl } from '../services/visualSearch/VisualSearchService'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

/** POST /api/search/visual — body: multipart "image" file, or JSON { imageUrl: string }. Returns similar products/supplier items. */
router.post('/visual', upload.single('image'), async (req, res, next) => {
  try {
    let results
    if (req.file?.buffer) {
      results = await searchByImageBuffer(
        req.file.buffer,
        DEFAULT_ORG_ID,
        20
      )
    } else if (req.body?.imageUrl && typeof req.body.imageUrl === 'string') {
      results = await searchByImageUrl(
        req.body.imageUrl,
        DEFAULT_ORG_ID,
        20
      )
    } else {
      res.status(400).json(
        formatApiError(API_ERROR_CODES.VALIDATION, 'Provide an image file (multipart "image") or JSON body with imageUrl')
      )
      return
    }
    res.json({ data: { results } })
  } catch (error) {
    next(error)
  }
})

export const searchRouter = router
