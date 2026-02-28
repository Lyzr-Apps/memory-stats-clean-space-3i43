'use client'

import React, { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IoStatsChart, IoCheckmarkDone, IoGitNetwork, IoTime, IoEllipse } from 'react-icons/io5'
import ProjectionsSection from './sections/ProjectionsSection'
import ResultsSection from './sections/ResultsSection'
import PatternsSection from './sections/PatternsSection'
import HistorySection from './sections/HistorySection'

const PROJECTION_AGENT_ID = '69a32c744b95c3d826d18d64'
const RESULTS_AGENT_ID = '69a32c74931679f19b7d6d3d'
const PATTERN_AGENT_ID = '69a32c757452fc0731a6395a'

const AGENTS = [
  { id: PROJECTION_AGENT_ID, name: 'Projection Agent', purpose: 'Generates game & player projections' },
  { id: RESULTS_AGENT_ID, name: 'Results Agent', purpose: 'Compares projections vs actuals' },
  { id: PATTERN_AGENT_ID, name: 'Pattern Agent', purpose: 'Identifies winning signal patterns' },
]

type Screen = 'projections' | 'results' | 'patterns' | 'history'

const NAV_ITEMS: { key: Screen; label: string; icon: React.ReactNode }[] = [
  { key: 'projections', label: 'Projections', icon: <IoStatsChart className="h-4 w-4" /> },
  { key: 'results', label: 'Results', icon: <IoCheckmarkDone className="h-4 w-4" /> },
  { key: 'patterns', label: 'Patterns', icon: <IoGitNetwork className="h-4 w-4" /> },
  { key: 'history', label: 'History', icon: <IoTime className="h-4 w-4" /> },
]

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Page() {
  const [activeScreen, setActiveScreen] = useState<Screen>('projections')
  const [showSample, setShowSample] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [todayDate, setTodayDate] = useState('')

  useEffect(() => {
    setTodayDate(new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }))
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        <aside className="w-56 shrink-0 border-r border-border bg-[hsl(220,24%,8%)] flex flex-col">
          <div className="px-4 pt-5 pb-3">
            <h1 className="text-base font-semibold tracking-tight text-foreground">INNO</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">NHL Projections</p>
          </div>
          <div className="px-4 pb-3">
            <p className="text-[10px] text-muted-foreground font-mono">{todayDate}</p>
          </div>
          <Separator className="bg-border" />
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveScreen(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-medium transition-colors ${activeScreen === item.key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          <Separator className="bg-border" />
          <div className="px-3 py-3 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Agents</p>
            {AGENTS.map(agent => (
              <div key={agent.id} className="flex items-start gap-1.5">
                <IoEllipse className={`h-2 w-2 mt-1 shrink-0 ${activeAgentId === agent.id ? 'text-green-400 animate-pulse' : 'text-muted-foreground/40'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] text-foreground font-medium truncate">{agent.name}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{agent.purpose}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 pb-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sample-toggle" className="text-[10px] text-muted-foreground cursor-pointer">Sample Data</Label>
              <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} className="scale-75" />
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <ScrollArea className="h-screen">
            <div className="p-4 max-w-[1200px]">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-foreground">{NAV_ITEMS.find(n => n.key === activeScreen)?.label ?? ''}</h2>
              </div>
              {activeScreen === 'projections' && (
                <ProjectionsSection showSample={showSample} activeAgentId={activeAgentId} setActiveAgentId={setActiveAgentId} />
              )}
              {activeScreen === 'results' && (
                <ResultsSection showSample={showSample} activeAgentId={activeAgentId} setActiveAgentId={setActiveAgentId} />
              )}
              {activeScreen === 'patterns' && (
                <PatternsSection showSample={showSample} activeAgentId={activeAgentId} setActiveAgentId={setActiveAgentId} />
              )}
              {activeScreen === 'history' && (
                <HistorySection showSample={showSample} />
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </ErrorBoundary>
  )
}
