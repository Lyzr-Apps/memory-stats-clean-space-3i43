'use client'

import React, { useState } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { IoRefresh, IoTrendingUp } from 'react-icons/io5'

const RESULTS_AGENT_ID = '69a32c74931679f19b7d6d3d'

interface GameResult {
  game?: string; projected_total?: number; actual_total?: number
  projected_away_goals?: number; actual_away_goals?: number
  projected_home_goals?: number; actual_home_goals?: number
  flags_projected?: string[]; flags_hit?: string[]; flags_missed?: string[]
}
interface PlayerResult {
  player?: string; team?: string; projected_sog?: number; actual_sog?: number
  projected_pts?: number; actual_pts?: number
  flags_projected?: string[]; flags_hit?: string[]; flags_missed?: string[]
}
interface AccuracyData {
  overall_hit_rate?: number
  flag_accuracy?: { sure2?: number; o1_5_100?: number; u1_5_100?: number; two_g_plus?: number; three_g_plus?: number; u2_5?: number }
  confidence_calibration?: Array<{ range?: string; accuracy?: number; sample_size?: number }>
}
interface Insight { category?: string; insight?: string; suggested_action?: string }
interface ResultsMeta { date?: string; games_analyzed?: number; players_analyzed?: number }

interface ResultsSectionProps {
  showSample: boolean
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}

const SAMPLE_GAME_RESULTS: GameResult[] = [
  { game: 'CGY@PIT', projected_total: 5.3, actual_total: 5, projected_away_goals: 2.4, actual_away_goals: 2, projected_home_goals: 2.9, actual_home_goals: 3, flags_projected: ['SURE2', 'O1.5_100'], flags_hit: ['SURE2', 'O1.5_100'], flags_missed: [] },
  { game: 'CBJ@COL', projected_total: 5.7, actual_total: 7, projected_away_goals: 2.1, actual_away_goals: 3, projected_home_goals: 3.6, actual_home_goals: 4, flags_projected: ['O1.5_100', '2G+', '3G+'], flags_hit: ['O1.5_100', '3G+'], flags_missed: ['2G+'] },
]
const SAMPLE_PLAYER_RESULTS: PlayerResult[] = [
  { player: 'N. MacKinnon', team: 'COL', projected_sog: 4.2, actual_sog: 5, projected_pts: 1.4, actual_pts: 2, flags_projected: ['SURE2', 'O1.5_100'], flags_hit: ['SURE2', 'O1.5_100'], flags_missed: [] },
  { player: 'S. Crosby', team: 'PIT', projected_sog: 3.1, actual_sog: 2, projected_pts: 1.1, actual_pts: 1, flags_projected: ['SURE2'], flags_hit: ['SURE2'], flags_missed: [] },
]
const SAMPLE_ACCURACY: AccuracyData = { overall_hit_rate: 0.72, flag_accuracy: { sure2: 0.85, o1_5_100: 0.78, u1_5_100: 0.65, two_g_plus: 0.55, three_g_plus: 0.42, u2_5: 0.60 }, confidence_calibration: [{ range: '80-100%', accuracy: 0.82, sample_size: 45 }, { range: '60-80%', accuracy: 0.68, sample_size: 120 }] }
const SAMPLE_INSIGHTS: Insight[] = [
  { category: 'SOG Accuracy', insight: 'Player SOG projections over-estimate by 0.3 on average for road teams', suggested_action: 'Apply -0.3 correction for away players' },
  { category: 'Flag Performance', insight: 'SURE2 flag maintains 85% accuracy across 200+ sample', suggested_action: 'Continue using SURE2 as primary confidence indicator' },
]

function kpiColor(val: number): string {
  if (val >= 0.75) return 'text-green-400'
  if (val >= 0.55) return 'text-yellow-400'
  return 'text-red-400'
}

export default function ResultsSection({ showSample, activeAgentId, setActiveAgentId }: ResultsSectionProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [gameResults, setGameResults] = useState<GameResult[]>([])
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([])
  const [accuracy, setAccuracy] = useState<AccuracyData | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [metadata, setMetadata] = useState<ResultsMeta | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dGames = showSample && gameResults.length === 0 ? SAMPLE_GAME_RESULTS : gameResults
  const dPlayers = showSample && playerResults.length === 0 ? SAMPLE_PLAYER_RESULTS : playerResults
  const dAccuracy = showSample && !accuracy ? SAMPLE_ACCURACY : accuracy
  const dInsights = showSample && insights.length === 0 ? SAMPLE_INSIGHTS : insights

  const handleUpdate = async () => {
    if (!selectedDate) return
    setLoading(true)
    setError(null)
    setActiveAgentId(RESULTS_AGENT_ID)
    try {
      let storedProjections = {}
      try { storedProjections = JSON.parse(localStorage.getItem('nhl_projections') || '{}') } catch { /* ignore */ }
      const message = `Compare projections against actual results for ${selectedDate}. Here are the projections: ${JSON.stringify(storedProjections)}`
      const result = await callAIAgent(message, RESULTS_AGENT_ID)
      if (result.success) {
        let data = result?.response?.result
        if (typeof data === 'string') { try { data = JSON.parse(data) } catch { data = {} } }
        setGameResults(Array.isArray(data?.game_results) ? data.game_results : [])
        setPlayerResults(Array.isArray(data?.player_results) ? data.player_results : [])
        setAccuracy(data?.accuracy ?? null)
        setInsights(Array.isArray(data?.learning_insights) ? data.learning_insights : [])
        setMetadata(data?.metadata ?? null)
        try {
          const history = JSON.parse(localStorage.getItem('nhl_history') || '[]')
          history.push({ date: selectedDate, game_results: data?.game_results, player_results: data?.player_results, accuracy: data?.accuracy })
          localStorage.setItem('nhl_history', JSON.stringify(history))
        } catch { /* storage full */ }
      } else {
        setError(result?.error ?? 'Failed to fetch results')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const flagAcc = dAccuracy?.flag_accuracy
  const kpis = [
    { label: 'Overall', value: dAccuracy?.overall_hit_rate },
    { label: 'SURE2', value: flagAcc?.sure2 },
    { label: 'O1.5', value: flagAcc?.o1_5_100 },
    { label: 'U1.5', value: flagAcc?.u1_5_100 },
    { label: '2G+', value: flagAcc?.two_g_plus },
    { label: '3G+', value: flagAcc?.three_g_plus },
    { label: 'U2.5', value: flagAcc?.u2_5 },
  ]

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Results Date</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-8 w-[180px] bg-input border-border text-foreground text-xs font-mono" />
            </div>
            <Button onClick={handleUpdate} disabled={loading || !selectedDate} className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
              {loading ? <><IoRefresh className="mr-1.5 h-3 w-3 animate-spin" /> Updating...</> : 'Update Results'}
            </Button>
            {metadata?.date && <span className="text-xs text-muted-foreground font-mono ml-auto">{metadata.games_analyzed ?? 0} games, {metadata.players_analyzed ?? 0} players analyzed</span>}
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {loading && (
        <div className="grid grid-cols-7 gap-2">
          {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-16 bg-muted" />)}
        </div>
      )}

      {!loading && dAccuracy && (
        <div className="grid grid-cols-7 gap-2">
          {kpis.map((k, i) => (
            <Card key={i} className="border border-border bg-card">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{k.label}</p>
                <p className={`text-lg font-mono font-semibold ${kpiColor(k.value ?? 0)}`}>
                  {typeof k.value === 'number' ? (k.value * 100).toFixed(0) + '%' : '--'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && (dGames.length > 0 || dPlayers.length > 0) && (
        <Tabs defaultValue="games" className="w-full">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="games" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Games ({dGames.length})</TabsTrigger>
            <TabsTrigger value="players" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Players ({dPlayers.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="games">
            <Card className="border border-border bg-card">
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Game</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Proj Total</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Actual Total</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Proj A.G</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Act A.G</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Proj H.G</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Act H.G</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Flags Hit</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Flags Missed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dGames.map((g, i) => (
                        <TableRow key={i} className="border-border hover:bg-secondary/50">
                          <TableCell className="text-xs font-mono font-medium px-3 py-1.5">{g?.game ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right px-3 py-1.5">{g?.projected_total?.toFixed(1) ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right font-medium px-3 py-1.5">{g?.actual_total ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right px-3 py-1.5">{g?.projected_away_goals?.toFixed(1) ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right px-3 py-1.5">{g?.actual_away_goals ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right px-3 py-1.5">{g?.projected_home_goals?.toFixed(1) ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right px-3 py-1.5">{g?.actual_home_goals ?? '-'}</TableCell>
                          <TableCell className="px-3 py-1.5">
                            <div className="flex gap-0.5 flex-wrap">
                              {Array.isArray(g?.flags_hit) && g.flags_hit.map((f, j) => (
                                <Badge key={j} variant="outline" className="text-[10px] px-1 py-0 bg-green-600/20 text-green-400 border-green-600/30">{f}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-1.5">
                            <div className="flex gap-0.5 flex-wrap">
                              {Array.isArray(g?.flags_missed) && g.flags_missed.map((f, j) => (
                                <Badge key={j} variant="outline" className="text-[10px] px-1 py-0 bg-red-600/20 text-red-400 border-red-600/30">{f}</Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="players">
            <Card className="border border-border bg-card">
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Player</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Team</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Proj SOG</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Act SOG</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Proj PTS</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3 text-right">Act PTS</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Flags Hit</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Flags Missed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dPlayers.map((p, i) => (
                        <TableRow key={i} className="border-border hover:bg-secondary/50">
                          <TableCell className="text-xs font-medium px-3 py-1.5">{p?.player ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono px-3 py-1.5">{p?.team ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right px-3 py-1.5">{p?.projected_sog?.toFixed(1) ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right font-medium px-3 py-1.5">{p?.actual_sog ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right px-3 py-1.5">{p?.projected_pts?.toFixed(1) ?? '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-right font-medium px-3 py-1.5">{p?.actual_pts ?? '-'}</TableCell>
                          <TableCell className="px-3 py-1.5">
                            <div className="flex gap-0.5 flex-wrap">
                              {Array.isArray(p?.flags_hit) && p.flags_hit.map((f, j) => (
                                <Badge key={j} variant="outline" className="text-[10px] px-1 py-0 bg-green-600/20 text-green-400 border-green-600/30">{f}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-1.5">
                            <div className="flex gap-0.5 flex-wrap">
                              {Array.isArray(p?.flags_missed) && p.flags_missed.map((f, j) => (
                                <Badge key={j} variant="outline" className="text-[10px] px-1 py-0 bg-red-600/20 text-red-400 border-red-600/30">{f}</Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!loading && dInsights.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-1.5"><IoTrendingUp className="h-3.5 w-3.5 text-accent" /> Learning Insights</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {dInsights.map((ins, i) => (
              <div key={i} className="border border-border rounded-sm p-3 bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">{ins?.category ?? 'General'}</Badge>
                </div>
                <p className="text-xs text-foreground">{ins?.insight ?? ''}</p>
                {ins?.suggested_action && <p className="text-[10px] text-accent mt-1">Action: {ins.suggested_action}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && dAccuracy && Array.isArray(dAccuracy?.confidence_calibration) && dAccuracy.confidence_calibration.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-foreground">Confidence Calibration</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {dAccuracy.confidence_calibration.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-20">{c?.range ?? '-'}</span>
                <Progress value={typeof c?.accuracy === 'number' ? c.accuracy * 100 : 0} className="flex-1 h-2" />
                <span className="text-xs font-mono text-foreground w-12 text-right">{typeof c?.accuracy === 'number' ? (c.accuracy * 100).toFixed(0) + '%' : '-'}</span>
                <span className="text-[10px] text-muted-foreground w-16 text-right">n={c?.sample_size ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && dGames.length === 0 && dPlayers.length === 0 && !dAccuracy && (
        <Card className="border border-border bg-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">Select a date and click Update Results to compare projections vs actuals</p>
            <p className="text-muted-foreground text-xs mt-1">Projections from the Projections tab are automatically loaded</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
