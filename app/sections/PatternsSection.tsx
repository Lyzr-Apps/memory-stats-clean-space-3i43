'use client'

import React, { useState } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { IoSearch, IoRefresh, IoWarning, IoShield, IoTrendingUp } from 'react-icons/io5'

const PATTERN_AGENT_ID = '69a32c757452fc0731a6395a'

interface Pattern {
  id?: string; name?: string; description?: string; signals?: string[]
  category?: string; hit_rate?: number; sample_size?: number
  confidence_level?: string; recommended_action?: string; risk_level?: string
}
interface AntiPattern {
  id?: string; name?: string; description?: string; signals?: string[]
  fail_rate?: number; sample_size?: number; warning?: string
}
interface PatternSummary {
  total_patterns_found?: number; top_pattern_hit_rate?: number
  most_reliable_category?: string; overall_recommendation?: string
}

interface PatternsSectionProps {
  showSample: boolean
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}

const SAMPLE_PATTERNS: Pattern[] = [
  { id: 'P1', name: 'High-Event Home Favorite', description: 'Home favorites in high-event environments with top-line deployment consistently exceed projected SOG totals', signals: ['HOME_FAV', 'HIGH_EVENT', '1L', 'PP1'], category: 'SOG Over', hit_rate: 0.82, sample_size: 45, confidence_level: 'High', recommended_action: 'Target SOG overs for home favorites in high-event games', risk_level: 'Low' },
  { id: 'P2', name: 'SURE2 + O1.5 Combo', description: 'When both SURE2 and O1.5_100 flags are present, the player achieves 2+ SOG in 88% of cases', signals: ['SURE2', 'O1.5_100'], category: 'Multi-Flag', hit_rate: 0.88, sample_size: 67, confidence_level: 'Very High', recommended_action: 'Prioritize plays with dual SURE2+O1.5 flags', risk_level: 'Very Low' },
  { id: 'P3', name: 'Road Dog Bounce', description: 'Road underdogs with recent 3-game scoring drought show above-average SOG bounce-back rates', signals: ['ROAD_DOG', 'DROUGHT_3G'], category: 'Contrarian', hit_rate: 0.64, sample_size: 28, confidence_level: 'Medium', recommended_action: 'Use as secondary filter, not primary', risk_level: 'Medium' },
]
const SAMPLE_ANTI: AntiPattern[] = [
  { id: 'A1', name: 'Back-to-Back Away Fade', description: 'Players on the second game of a back-to-back on the road consistently underperform SOG projections', signals: ['B2B', 'ROAD', 'FATIGUE'], fail_rate: 0.71, sample_size: 34, warning: 'Reduce SOG projections by 15-20% for B2B road situations' },
  { id: 'A2', name: 'Low-Event Trap Game', description: 'Games flagged as LOW_EVENT between defensive teams produce significantly fewer shots and goals', signals: ['LOW_EVENT', 'DEF_MATCHUP'], fail_rate: 0.65, sample_size: 22, warning: 'Avoid SOG overs in low-event defensive matchups' },
]
const SAMPLE_SUMMARY: PatternSummary = { total_patterns_found: 12, top_pattern_hit_rate: 0.88, most_reliable_category: 'Multi-Flag', overall_recommendation: 'Focus on dual-flag plays (SURE2+O1.5) as your highest-confidence tier. Avoid B2B road situations.' }

function confidenceColor(level?: string): string {
  const l = (level ?? '').toLowerCase()
  if (l.includes('very high')) return 'bg-green-600/20 text-green-400 border-green-600/30'
  if (l.includes('high')) return 'bg-green-600/20 text-green-400 border-green-600/30'
  if (l.includes('medium')) return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
  return 'bg-red-600/20 text-red-400 border-red-600/30'
}

function riskColor(level?: string): string {
  const l = (level ?? '').toLowerCase()
  if (l.includes('very low') || l === 'low') return 'bg-green-600/20 text-green-400 border-green-600/30'
  if (l.includes('medium')) return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
  return 'bg-red-600/20 text-red-400 border-red-600/30'
}

export default function PatternsSection({ showSample, activeAgentId, setActiveAgentId }: PatternsSectionProps) {
  const [loading, setLoading] = useState(false)
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [antiPatterns, setAntiPatterns] = useState<AntiPattern[]>([])
  const [summary, setSummary] = useState<PatternSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dPatterns = showSample && patterns.length === 0 ? SAMPLE_PATTERNS : patterns
  const dAnti = showSample && antiPatterns.length === 0 ? SAMPLE_ANTI : antiPatterns
  const dSummary = showSample && !summary ? SAMPLE_SUMMARY : summary

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setActiveAgentId(PATTERN_AGENT_ID)
    try {
      let history: unknown[] = []
      try { history = JSON.parse(localStorage.getItem('nhl_history') || '[]') } catch { /* ignore */ }
      const message = `Analyze the following prediction history and identify winning patterns: ${JSON.stringify(history)}`
      const result = await callAIAgent(message, PATTERN_AGENT_ID)
      if (result.success) {
        let data = result?.response?.result
        if (typeof data === 'string') { try { data = JSON.parse(data) } catch { data = {} } }
        setPatterns(Array.isArray(data?.patterns) ? data.patterns : [])
        setAntiPatterns(Array.isArray(data?.anti_patterns) ? data.anti_patterns : [])
        setSummary(data?.summary ?? null)
      } else {
        setError(result?.error ?? 'Failed to analyze patterns')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Button onClick={handleAnalyze} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
              {loading ? <><IoRefresh className="mr-1.5 h-3 w-3 animate-spin" /> Analyzing...</> : <><IoSearch className="mr-1.5 h-3 w-3" /> Analyze Patterns</>}
            </Button>
            <span className="text-xs text-muted-foreground">Analyzes accumulated prediction history from Results tab</span>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 bg-muted" />)}
        </div>
      )}

      {!loading && dSummary && (
        <div className="grid grid-cols-4 gap-2">
          <Card className="border border-border bg-card">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Patterns Found</p>
              <p className="text-xl font-mono font-semibold text-primary">{dSummary?.total_patterns_found ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Top Hit Rate</p>
              <p className="text-xl font-mono font-semibold text-green-400">{typeof dSummary?.top_pattern_hit_rate === 'number' ? (dSummary.top_pattern_hit_rate * 100).toFixed(0) + '%' : '--'}</p>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Best Category</p>
              <p className="text-sm font-medium text-foreground mt-1">{dSummary?.most_reliable_category ?? '--'}</p>
            </CardContent>
          </Card>
          <Card className="border border-border bg-card col-span-1">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recommendation</p>
              <p className="text-xs text-foreground mt-1 leading-snug">{dSummary?.overall_recommendation ?? '--'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && dPatterns.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <IoShield className="h-3.5 w-3.5 text-green-400" />
            <h3 className="text-sm font-medium text-foreground">Winning Patterns</h3>
          </div>
          <div className="space-y-2">
            {dPatterns.map((p, i) => (
              <Card key={i} className="border border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-foreground">{p?.name ?? 'Pattern'}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-primary/10 text-primary border-primary/30">{p?.category ?? '-'}</Badge>
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${confidenceColor(p?.confidence_level)}`}>{p?.confidence_level ?? '-'}</Badge>
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${riskColor(p?.risk_level)}`}>Risk: {p?.risk_level ?? '-'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{p?.description ?? ''}</p>
                      <div className="flex gap-1 flex-wrap mb-2">
                        {Array.isArray(p?.signals) && p.signals.map((s, j) => (
                          <Badge key={j} variant="outline" className="text-[10px] px-1 py-0 bg-secondary text-secondary-foreground border-border">{s}</Badge>
                        ))}
                      </div>
                      {p?.recommended_action && <p className="text-[10px] text-accent"><IoTrendingUp className="inline h-2.5 w-2.5 mr-0.5" /> {p.recommended_action}</p>}
                    </div>
                    <div className="text-right shrink-0 w-24">
                      <p className="text-lg font-mono font-semibold text-green-400">{typeof p?.hit_rate === 'number' ? (p.hit_rate * 100).toFixed(0) + '%' : '--'}</p>
                      <Progress value={typeof p?.hit_rate === 'number' ? p.hit_rate * 100 : 0} className="h-1.5 mt-1" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">n={p?.sample_size ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && dAnti.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <IoWarning className="h-3.5 w-3.5 text-red-400" />
            <h3 className="text-sm font-medium text-foreground">Anti-Patterns (Avoid)</h3>
          </div>
          <div className="space-y-2">
            {dAnti.map((a, i) => (
              <Card key={i} className="border border-destructive/30 bg-destructive/5">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-foreground">{a?.name ?? 'Anti-Pattern'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{a?.description ?? ''}</p>
                      <div className="flex gap-1 flex-wrap mb-2">
                        {Array.isArray(a?.signals) && a.signals.map((s, j) => (
                          <Badge key={j} variant="outline" className="text-[10px] px-1 py-0 bg-red-600/10 text-red-400 border-red-600/20">{s}</Badge>
                        ))}
                      </div>
                      {a?.warning && <p className="text-[10px] text-red-400"><IoWarning className="inline h-2.5 w-2.5 mr-0.5" /> {a.warning}</p>}
                    </div>
                    <div className="text-right shrink-0 w-24">
                      <p className="text-lg font-mono font-semibold text-red-400">{typeof a?.fail_rate === 'number' ? (a.fail_rate * 100).toFixed(0) + '%' : '--'}</p>
                      <p className="text-[10px] text-muted-foreground">fail rate</p>
                      <p className="text-[10px] text-muted-foreground">n={a?.sample_size ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && dPatterns.length === 0 && dAnti.length === 0 && !dSummary && (
        <Card className="border border-border bg-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">Click Analyze Patterns to discover winning signal combinations</p>
            <p className="text-muted-foreground text-xs mt-1">Works best with accumulated Results history data</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
