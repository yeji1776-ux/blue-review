// 플랜 설정 — BloggerMasterApp.jsx에서 추출
export const PLAN_LIMITS = {
  schedule: { free: 5,  standard: 20, pro: Infinity },
  template: { free: 2,  standard: 4,  pro: Infinity },
}

export const PLAN_META = {
  free:     { label: '무료',      color: 'bg-slate-100 text-slate-600',                              desc: '협찬 월 5건 · 템플릿 2개' },
  standard: { label: '스탠다드',  color: 'bg-sky-100 text-sky-700',                                  desc: '협찬 월 20건 · 템플릿 4개' },
  pro:      { label: '프로',      color: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white',  desc: '모든 기능 무제한' },
}
