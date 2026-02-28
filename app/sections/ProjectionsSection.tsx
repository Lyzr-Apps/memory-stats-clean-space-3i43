'use client'

import React, { useState } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IoRefresh, IoFilter, IoCalendar } from 'react-icons/io5'

const PROJECTION_AGENT_ID = '69a32c744b95c3d826d18d64'

interface GameProjection {
  game?: string; env?: string; away_sog?: number; home_sog?: number
  away_goals?: number; home_goals?: number; total?: number; flags?: string[]
}
interface PlayerProjection {
  player?: string; team?: string; opp?: string; env?: string; gp?: number
  toi?: string; line?: string; pp?: string; sog?: number; p_2plus_sog?: number
  p_3plus_sog?: number; pts?: number; p_1plus_pts?: number; sog_conf?: number
  pts_conf?: number; flags?: string[]
}
interface ProjectionMeta { date?: string; num_games?: number; generated_at?: string; data_sources?: string }

interface ProjectionsSectionProps {
  showSample: boolean
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}

const SAMPLE_GAMES: GameProjection[] = [
  { game: 'CGY@PIT', env: 'NEUTRAL', away_sog: 28.5, home_sog: 31.2, away_goals: 2.4, home_goals: 2.9, total: 5.3, flags: ['SURE2', 'O1.5_100'] },
  { game: 'CBJ@COL', env: 'HIGH_EVENT', away_sog: 25.1, home_sog: 34.8, away_goals: 2.1, home_goals: 3.6, total: 5.7, flags: ['O1.5_100', '2G+', '3G+'] },
  { game: 'NJD@TOR', env: 'NEUTRAL', away_sog: 29.0, home_sog: 33.5, away_goals: 2.5, home_goals: 3.0, total: 5.5, flags: ['SURE2'] },
]
const SAMPLE_PLAYERS: PlayerProjection[] = [
  { player: 'N. MacKinnon', team: 'COL', opp: 'CBJ', env: 'HIGH_EVENT', gp: 65, toi: '21:30', line: '1L', pp: 'PP1', sog: 4.2, p_2plus_sog: 0.82, p_3plus_sog: 0.61, pts: 1.4, p_1plus_pts: 0.78, sog_conf: 0.91, pts_conf: 0.85, flags: ['SURE2', 'O1.5_100'] },
  { player: 'S. Crosby', team: 'PIT', opp: 'CGY', env: 'NEUTRAL', gp: 64, toi: '20:45', line: '1L', pp: 'PP1', sog: 3.1, p_2plus_sog: 0.68, p_3plus_sog: 0.41, pts: 1.1, p_1plus_pts: 0.72, sog_conf: 0.84, pts_conf: 0.79, flags: ['SURE2'] },
  { player: 'A. Matthews', team: 'TOR', opp: 'NJD', env: 'NEUTRAL', gp: 60, toi: '20:10', line: '1L', pp: 'PP1', sog: 4.5, p_2plus_sog: 0.85, p_3plus_sog: 0.65, pts: 1.2, p_1plus_pts: 0.74, sog_conf: 0.92, pts_conf: 0.80, flags: ['SURE2', 'O1.5_100', '2G+'] },
  { player: 'J. Gaudreau', team: 'CBJ', opp: 'COL', env: 'HIGH_EVENT', gp: 66, toi: '19:20', line: '1L', pp: 'PP1', sog: 2.8, p_2plus_sog: 0.55, p_3plus_sog: 0.28, pts: 0.9, p_1plus_pts: 0.65, sog_conf: 0.76, pts_conf: 0.70, flags: ['UNDER_RISK'] },
]

function flagColor(flag: string): string {
  const f = flag.toUpperCase()
  if (f.includes('SURE2')) return 'bg-green-600/20 text-green-400 border-green-600/30'
  if (f.includes('O1') || f.includes('O2') || f.includes('OVER')) return 'bg-green-600/20 text-green-400 border-green-600/30'
  if (f.includes('UNDER') || f.includes('U1') || f.includes('U2')) return 'bg-red-600/20 text-red-400 border-red-600/30'
  if (f.includes('2G') || f.includes('3G')) return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
  if (f.includes('HIGH') || f.includes('ENV')) return 'bg-blue-600/20 text-blue-400 border-blue-600/30'
  return 'bg-muted text-muted-foreground border-border'
}

function envBadge(env?: string): string {
  if (!env) return 'bg-muted text-muted-foreground border-border'
  const e = env.toUpperCase()
  if (e.includes('HIGH')) return 'bg-blue-600/20 text-blue-400 border-blue-600/30'
  if (e.includes('LOW')) return 'bg-orange-600/20 text-orange-400 border-orange-600/30'
  return 'bg-muted text-muted-foreground border-border'
}

export default function ProjectionsSection({ showSample, activeAgentId, setActiveAgentId }: ProjectionsSectionProps) {
  const [loading, setLoading] = useState(false)
  const [games, setGames] = useState<GameProjection[]>([])
  const [players, setPlayers] = useState<PlayerProjection[]>([])
  const [metadata, setMetadata] = useState<ProjectionMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('sog')
  const [gameFilter, setGameFilter] = useState('all')
  const [hideUnderRisk, setHideUnderRisk] = useState(false)

  const displayGames = showSample && games.length === 0 ? SAMPLE_GAMES : games
  const displayPlayers = showSample && players.length === 0 ? SAMPLE_PLAYERS : players

  const gameOptions = Array.from(new Set(displayGames.map(g => g.game).filter(Boolean)))

  let filteredPlayers = gameFilter !== 'all'
    ? displayPlayers.filter(p => {
        const matchup = `${p?.team ?? ''}@${p?.opp ?? ''}`
        const matchupRev = `${p?.opp ?? ''}@${p?.team ?? ''}`
        return gameFilter === matchup || gameFilter === matchupRev || (p?.team ?? '') === gameFilter?.split('@')?.[0] || (p?.team ?? '') === gameFilter?.split('@')?.[1]
      })
    : displayPlayers

  if (hideUnderRisk) {
    filteredPlayers = filteredPlayers.filter(p => !Array.isArray(p?.flags) || !p.flags.some(f => f.toUpperCase().includes('UNDER_RISK')))
  }

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (sortBy === 'sog') return (b?.sog ?? 0) - (a?.sog ?? 0)
    if (sortBy === 'pts') return (b?.pts ?? 0) - (a?.pts ?? 0)
    if (sortBy === 'sure2') {
      const aHas = Array.isArray(a?.flags) && a.flags.some(f => f.toUpperCase().includes('SURE2')) ? 1 : 0
      const bHas = Array.isArray(b?.flags) && b.flags.some(f => f.toUpperCase().includes('SURE2')) ? 1 : 0
      return bHas - aHas || (b?.sog ?? 0) - (a?.sog ?? 0)
    }
    if (sortBy === 'risk') {
      const aRisk = Array.isArray(a?.flags) && a.flags.some(f => f.toUpperCase().includes('RISK')) ? 1 : 0
      const bRisk = Array.isArray(b?.flags) && b.flags.some(f => f.toUpperCase().includes('RISK')) ? 1 : 0
      return aRisk - bRisk || (b?.sog ?? 0) - (a?.sog ?? 0)
    }
    return 0
  })

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setActiveAgentId(PROJECTION_AGENT_ID)
    try {
      const today = new Date()
      const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const result = await callAIAgent(
        `Today is ${dateStr}. Automatically look up the full NHL schedule for today, fetch all relevant team and player stats, and generate complete projections for every game being played today. Do NOT ask me for matchups — find them yourself via web search.`,
        PROJECTION_AGENT_ID
      )
      if (result.success) {
        let data = result?.response?.result
        if (typeof data === 'string') { try { data = JSON.parse(data) } catch { data = {} } }
        const g = Array.isArray(data?.games) ? data.games : []
        const p = Array.isArray(data?.players) ? data.players : []
        setGames(g)
        setPlayers(p)
        setMetadata(data?.metadata ?? null)
        try {
          localStorage.setItem('nhl_projections', JSON.stringify({ date: new Date().toISOString(), games: g, players: p, metadata: data?.metadata }))
        } catch { /* storage full */ }
      } else {
        setError(result?.error ?? 'Failed to generate projections')
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
            <Button onClick={handleGenerate} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? (
                <><IoRefresh className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Fetching schedule &amp; generating...</>
              ) : (
                <><IoCalendar className="mr-1.5 h-3.5 w-3.5" /> Generate Today&apos;s Projections</>
              )}
            </Button>
            {metadata?.generated_at && (
              <span className="text-xs text-muted-foreground font-mono ml-auto">
                Generated: {metadata.generated_at} | {metadata?.num_games ?? 0} games | {metadata?.data_sources ?? ''}
              </span>
            )}
          </div>
          {loading && (
            <p className="text-xs text-muted-foreground mt-2">
              The agent is searching for today&apos;s NHL schedule and fetching live stats. This may take a moment...
            </p>
          )}
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {loading && (
        <Card className="border border-border bg-card">
          <CardContent className="pt-4 space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full bg-muted" />)}
          </CardContent>
        </Card>
      )}

      {!loading && displayGames.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-foreground">Game Projections</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground font-medium h-8 px-3">Game</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium h-8 px-3">ENV</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium h-8 px-3 text-right">A.SOG</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium h-8 px-3 text-right">H.SOG</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium h-8 px-3 text-right">A.G</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium h-8 px-3 text-right">H.G</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium h-8 px-3 text-right">Total</TableHead>
                    <TableHead className="text-xs text-muted-foreground font-medium h-8 px-3">Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayGames.map((g, i) => (
                    <TableRow key={i} className="border-border hover:bg-secondary/50">
                      <TableCell className="text-xs font-mono font-medium px-3 py-1.5">{g?.game ?? '-'}</TableCell>
                      <TableCell className="px-3 py-1.5"><Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${envBadge(g?.env)}`}>{g?.env ?? '-'}</Badge></TableCell>
                      <TableCell className="text-xs font-mono text-right px-3 py-1.5">{g?.away_sog?.toFixed(1) ?? '-'}</TableCell>
                      <TableCell className="text-xs font-mono text-right px-3 py-1.5">{g?.home_sog?.toFixed(1) ?? '-'}</TableCell>
                      <TableCell className="text-xs font-mono text-right px-3 py-1.5">{g?.away_goals?.toFixed(1) ?? '-'}</TableCell>
                      <TableCell className="text-xs font-mono text-right px-3 py-1.5">{g?.home_goals?.toFixed(1) ?? '-'}</TableCell>
                      <TableCell className="text-xs font-mono text-right font-medium px-3 py-1.5">{g?.total?.toFixed(1) ?? '-'}</TableCell>
                      <TableCell className="px-3 py-1.5">
                        <div className="flex gap-1 flex-wrap">
                          {Array.isArray(g?.flags) && g.flags.map((f, j) => (
                            <Badge key={j} variant="outline" className={`text-[10px] px-1.5 py-0 ${flagColor(f)}`}>{f}</Badge>
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
      )}

      {!loading && displayPlayers.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-foreground">Player Projections</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <IoFilter className="h-3 w-3 text-muted-foreground" />
                  <Select value={gameFilter} onValueChange={setGameFilter}>
                    <SelectTrigger className="h-7 text-xs w-[100px] bg-input border-border"><SelectValue placeholder="All Games" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="all" className="text-xs">All Games</SelectItem>
                      {gameOptions.map(g => <SelectItem key={g} value={g ?? ''} className="text-xs">{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-7 text-xs w-[90px] bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="sog" className="text-xs">Sort: SOG</SelectItem>
                    <SelectItem value="pts" className="text-xs">Sort: PTS</SelectItem>
                    <SelectItem value="sure2" className="text-xs">Sort: SURE2</SelectItem>
                    <SelectItem value="risk" className="text-xs">Sort: Risk</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Switch id="hide-risk" checked={hideUnderRisk} onCheckedChange={setHideUnderRisk} className="scale-75" />
                  <Label htmlFor="hide-risk" className="text-[10px] text-muted-foreground cursor-pointer">Hide UNDER_RISK</Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2">Player</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2">Team</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2">Opp</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2">ENV</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2 text-right">GP</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2 text-right">TOI</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2">L/PP</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2 text-right">SOG</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2 text-right">P(2+)</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2 text-right">P(3+)</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2 text-right">PTS</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2 text-right">P(1+PT)</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2 text-right">SOG%</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2 text-right">PTS%</TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-2">Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPlayers.map((p, i) => (
                      <TableRow key={i} className="border-border hover:bg-secondary/50">
                        <TableCell className="text-xs font-medium px-2 py-1">{p?.player ?? '-'}</TableCell>
                        <TableCell className="text-xs font-mono px-2 py-1">{p?.team ?? '-'}</TableCell>
                        <TableCell className="text-xs font-mono px-2 py-1">{p?.opp ?? '-'}</TableCell>
                        <TableCell className="px-2 py-1"><Badge variant="outline" className={`text-[10px] px-1 py-0 ${envBadge(p?.env)}`}>{p?.env ?? '-'}</Badge></TableCell>
                        <TableCell className="text-xs font-mono text-right px-2 py-1">{p?.gp ?? '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-right px-2 py-1">{p?.toi ?? '-'}</TableCell>
                        <TableCell className="text-xs font-mono px-2 py-1">{p?.line ?? '-'}/{p?.pp ?? '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-right font-medium px-2 py-1">{p?.sog?.toFixed(1) ?? '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-right px-2 py-1">{typeof p?.p_2plus_sog === 'number' ? (p.p_2plus_sog * 100).toFixed(0) + '%' : '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-right px-2 py-1">{typeof p?.p_3plus_sog === 'number' ? (p.p_3plus_sog * 100).toFixed(0) + '%' : '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-right font-medium px-2 py-1">{p?.pts?.toFixed(1) ?? '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-right px-2 py-1">{typeof p?.p_1plus_pts === 'number' ? (p.p_1plus_pts * 100).toFixed(0) + '%' : '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-right px-2 py-1">{typeof p?.sog_conf === 'number' ? (p.sog_conf * 100).toFixed(0) + '%' : '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-right px-2 py-1">{typeof p?.pts_conf === 'number' ? (p.pts_conf * 100).toFixed(0) + '%' : '-'}</TableCell>
                        <TableCell className="px-2 py-1">
                          <div className="flex gap-0.5 flex-wrap">
                            {Array.isArray(p?.flags) && p.flags.map((f, j) => (
                              <Badge key={j} variant="outline" className={`text-[10px] px-1 py-0 ${flagColor(f)}`}>{f}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {!loading && displayGames.length === 0 && displayPlayers.length === 0 && (
        <Card className="border border-border bg-card">
          <CardContent className="py-12 text-center">
            <IoCalendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Click &quot;Generate Today&apos;s Projections&quot; to get started</p>
            <p className="text-muted-foreground text-xs mt-1">The agent will automatically find today&apos;s NHL schedule and generate projections for all games</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
