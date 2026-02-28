'use client'

import { useEffect, useState, type ReactNode } from 'react'

export default function ClientProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [Providers, setProviders] = useState<React.ComponentType<{ children: ReactNode }> | null>(null)

  useEffect(() => {
    setMounted(true)
    // Dynamically import the providers only on client side
    Promise.all([
      import('@/components/IframeLoggerInit'),
      import('@/components/ErrorBoundary'),
      import('@/components/AgentInterceptorProvider'),
    ]).then(([iframeModule, errorModule, interceptorModule]) => {
      const IframeLoggerInit = iframeModule.IframeLoggerInit
      const ErrorBoundary = errorModule.default
      const AgentInterceptorProvider = interceptorModule.AgentInterceptorProvider

      // Create a wrapper component with all providers
      const WrappedProviders = ({ children: c }: { children: ReactNode }) => (
        <>
          <IframeLoggerInit />
          <ErrorBoundary>
            <AgentInterceptorProvider>
              {c}
            </AgentInterceptorProvider>
          </ErrorBoundary>
        </>
      )
      setProviders(() => WrappedProviders)
    }).catch(() => {
      // If providers fail to load, just render children
      setMounted(true)
    })
  }, [])

  // During SSR and before client hydration, render children directly
  if (!mounted || !Providers) {
    return <>{children}</>
  }

  return <Providers>{children}</Providers>
}
