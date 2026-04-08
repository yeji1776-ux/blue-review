import { z } from 'zod'

const templateItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    title: z.string().default(''),
    content: z.string().default(''),
  })
  .passthrough()

export const templatesSchema = z.array(templateItemSchema)
export const ftcTemplatesSchema = z.array(templateItemSchema)
