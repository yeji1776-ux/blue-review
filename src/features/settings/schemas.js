import { z } from 'zod'

export const hashtagsSchema = z.record(z.string(), z.array(z.string()))

export const savedTextsSchema = z.array(
  z
    .object({
      id: z.union([z.string(), z.number()]),
    })
    .passthrough()
)
