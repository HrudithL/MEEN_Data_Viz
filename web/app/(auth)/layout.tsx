import { Atom } from 'lucide-react'
import { AuthEnter } from '@/components/motion'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center auth-bg px-4 py-12">
      <div className="w-full max-w-md">
        <AuthEnter>
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 mb-4 glow-sm animate-pulse-glow">
              <Atom className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">MEEN Data Viz</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Materials Science Experiment Platform</p>
          </div>
          {children}
        </AuthEnter>
      </div>
    </div>
  )
}
