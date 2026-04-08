import BloggerMasterApp from './BloggerMasterApp'
import { AppErrorBoundary } from './components/ui/ErrorBoundary'

function App() {
  return (
    <AppErrorBoundary>
      <BloggerMasterApp />
    </AppErrorBoundary>
  )
}

export default App
