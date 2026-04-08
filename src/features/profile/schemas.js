import { z } from 'zod'

export const profileSchema = z
  .object({
    nickname: z.string().optional(),
    blogUrl: z.string().optional(),
    blogClipUrl: z.string().optional(),
    blogClipId: z.string().optional(),
    instaId: z.string().optional(),
    reelsUrl: z.string().optional(),
    facebookUrl: z.string().optional(),
    youtubeUrl: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    enabledPlatforms: z.record(z.string(), z.boolean()).optional(),
    gcalSelectedCal: z.string().optional(),
  })
  .passthrough()
