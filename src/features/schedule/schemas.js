import { z } from 'zod'

const scheduleItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
  })
  .passthrough()

export const schedulesSchema = z.array(scheduleItemSchema)

// Gemini 응답은 형태가 가변적이라 느슨하게 검증
export const geminiParsedSchema = z.object({}).passthrough()
