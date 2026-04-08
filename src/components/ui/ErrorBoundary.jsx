import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

function Fallback({ error, resetErrorBoundary }) {
  return (
    <div className="jelly-card p-6 space-y-3 text-center">
      <p className="text-sm font-bold text-slate-600">
        이 영역에서 오류가 발생했어요.
      </p>
      <p className="text-xs text-slate-400 break-words">
        {error?.message || '알 수 없는 오류'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-bold active:scale-95 transition-all"
      >
        다시 시도
      </button>
    </div>
  )
}

export function AppErrorBoundary({ children, onReset }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={Fallback}
      onError={(error, info) => console.error('[ErrorBoundary]', error, info)}
      onReset={onReset}
    >
      {children}
    </ReactErrorBoundary>
  )
}
