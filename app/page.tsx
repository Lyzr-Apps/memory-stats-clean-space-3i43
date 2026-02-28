import nextDynamic from 'next/dynamic'

// Force dynamic rendering - prevents static generation SSR errors
export const dynamic = 'force-dynamic'

const InnoApp = nextDynamic(() => import('./sections/InnoApp'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'hsl(220, 25%, 7%)',
      color: 'hsl(220, 15%, 85%)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>INNO</h1>
        <p style={{ fontSize: '12px', opacity: 0.5 }}>Loading NHL Projections...</p>
      </div>
    </div>
  ),
})

export default function Page() {
  return <InnoApp />
}
