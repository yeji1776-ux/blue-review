// 안전한 JSON 파싱 + zod 스키마 검증 유틸
// raw가 falsy거나 JSON.parse 실패 또는 schema 검증 실패 시 fallback 반환
export function parseWithSchema(schema, raw, fallback) {
  if (!raw) return fallback
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    console.warn('[parseWithSchema] 스키마 검증 실패, 기본값 사용:', err)
    return fallback
  }
  const result = schema.safeParse(parsed)
  if (!result.success) {
    console.warn('[parseWithSchema] 스키마 검증 실패, 기본값 사용:', result.error)
    return fallback
  }
  return result.data
}
