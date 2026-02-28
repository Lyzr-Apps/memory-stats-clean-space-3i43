'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IoTrash, IoSearch } from 'react-icons/io5'

interface HistoryEntry {
  date?: string
  game_results?: Array<{
    game?: string; projected_total?: number; actual_total?: number
    flags_projected?: string[]; flags_hit?: string[]; flags_missed?: string[]
  }>
  player_results?: Array<{
    player?: string; team?: string; projected_sog?: number; actual_sog?: number
    projected_pts?: number; actual_pts?: number
    flags_projected?: string[]; flags_hit?: string[]; flags_missed?: string[]
  }>
  accuracy?: { overall_hit_rate?: number }
}

interface FlatRow {
  date: string; type: 'game' | 'player'; name: string; team: string
  projected: string; actual: string; flags: string[]; hit: boolean
}

interface HistorySectionProps {
  showSample: boolean
}

const SAMPLE_HISTORY: HistoryEntry[] = [
  {
    date: '2026-02-27',
    game_results: [
      { game: 'CGY@PIT', projected_total: 5.3, actual_total: 5, flags_projected: ['SURE2'], flags_hit: ['SURE2'], flags_missed: [] },
      { game: 'CBJ@COL', projected_total: 5.7, actual_total: 7, flags_projected: ['O1.5_100', '3G+'], flags_hit: ['O1.5_100'], flags_missed: ['3G+'] },
    ],
    player_results: [
      { player: 'N. MacKinnon', team: 'COL', projected_sog: 4.2, actual_sog: 5, projected_pts: 1.4, actual_pts: 2, flags_projected: ['SURE2'], flags_hit: ['SURE2'], flags_missed: [] },
      { player: 'S. Crosby', team: 'PIT', projected_sog: 3.1, actual_sog: 2, projected_pts: 1.1, actual_pts: 1, flags_projected: ['SURE2'], flags_hit: ['SURE2'], flags_missed: [] },
    ],
    accuracy: { overall_hit_rate: 0.75 },
  },
  {
    date: '2026-02-26',
    game_results: [
      { game: 'NYR@BOS', projected_total: 5.0, actual_total: 4, flags_projected: ['U1.5_100'], flags_hit: ['U1.5_100'], flags_missed: [] },
    ],
    player_results: [
      { player: 'A. Panarin', team: 'NYR', projected_sog: 3.5, actual_sog: 4, projected_pts: 1.0, actual_pts: 0, flags_projected: ['UNDER_RISK'], flags_hit: [], flags_missed: ['UNDER_RISK'] },
    ],
    accuracy: { overall_hit_rate: 0.60 },
  },
]

export default function HistorySection({ showSample }: HistorySectionProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('nhl_history') || '[]')
      if (Array.isArray(stored)) setHistory(stored)
    } catch { /* ignore */ }
  }, [])

  const displayHistory = showSample && history.length === 0 ? SAMPLE_HISTORY : history

  const flatRows: FlatRow[] = []
  displayHistory.forEach(entry => {
    const d = entry?.date ?? ''
    if (Array.isArray(entry?.game_results)) {
      entry.game_results.forEach(g => {
        const hitCount = Array.isArray(g?.flags_hit) ? g.flags_hit.length : 0
        const missCount = Array.isArray(g?.flags_missed) ? g.flags_missed.length : 0
        flatRows.push({
          date: d, type: 'game', name: g?.game ?? '-', team: '-',
          projected: `Total: ${g?.projected_total?.toFixed(1) ?? '-'}`,
          actual: `Total: ${g?.actual_total ?? '-'}`,
          flags: Array.isArray(g?.flags_projected) ? g.flags_projected : [],
          hit: hitCount > 0 && missCount === 0
        })
      })
    }
    if (Array.isArray(entry?.player_results)) {
      entry.player_results.forEach(p => {
        const hitCount = Array.isArray(p?.flags_hit) ? p.flags_hit.length : 0
        const missCount = Array.isArray(p?.flags_missed) ? p.flags_missed.length : 0
        flatRows.push({
          date: d, type: 'player', name: p?.player ?? '-', team: p?.team ?? '-',
          projected: `SOG: ${p?.projected_sog?.toFixed(1) ?? '-'} / PTS: ${p?.projected_pts?.toFixed(1) ?? '-'}`,
          actual: `SOG: ${p?.actual_sog ?? '-'} / PTS: ${p?.actual_pts ?? '-'}`,
          flags: Array.isArray(p?.flags_projected) ? p.flags_projected : [],
          hit: hitCount > 0 && missCount === 0
        })
      })
    }
  })

  let filtered = flatRows
  if (dateFrom) filtered = filtered.filter(r => r.date >= dateFrom)
  if (dateTo) filtered = filtered.filter(r => r.date <= dateTo)
  if (search.trim()) {
    const q = search.trim().toLowerCase()
    filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q))
  }

  const totalRows = filtered.length
  const hitRows = filtered.filter(r => r.hit).length
  const hitRate = totalRows > 0 ? (hitRows / totalRows * 100).toFixed(0) : '--'
  const uniqueDates = new Set(filtered.map(r => r.date)).size

  const handleClear = () => {
    localStorage.removeItem('nhl_history')
    setHistory([])
  }

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 w-[150px] bg-input border-border text-foreground text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 w-[150px] bg-input border-border text-foreground text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <IoSearch className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Team or player..." className="h-7 w-[180px] bg-input border-border text-foreground text-xs pl-7" />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClear} className="h-7 text-xs border-border text-muted-foreground hover:text-destructive">
              <IoTrash className="mr-1 h-3 w-3" /> Clear History
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        <Card className="border border-border bg-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Records</p>
            <p className="text-lg font-mono font-semibold text-foreground">{totalRows}</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dates</p>
            <p className="text-lg font-mono font-semibold text-foreground">{uniqueDates}</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hits</p>
            <p className="text-lg font-mono font-semibold text-green-400">{hitRows}</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hit Rate</p>
            <p className="text-lg font-mono font-semibold text-primary">{hitRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-card">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] w-full">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Date</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Type</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Game/Player</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Team</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Projection</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Actual</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Flags</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground font-medium h-7 px-3">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground text-xs py-8">
                      {displayHistory.length === 0 ? 'No history data yet. Run Results to build history.' : 'No records match your filters.'}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r, i) => (
                  <TableRow key={i} className="border-border hover:bg-secondary/50">
                    <TableCell className="text-xs font-mono px-3 py-1">{r.date}</TableCell>
                    <TableCell className="px-3 py-1"><Badge variant="outline" className={`text-[10px] px-1 py-0 ${r.type === 'game' ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' : 'bg-purple-600/20 text-purple-400 border-purple-600/30'}`}>{r.type}</Badge></TableCell>
                    <TableCell className="text-xs font-medium px-3 py-1">{r.name}</TableCell>
                    <TableCell className="text-xs font-mono px-3 py-1">{r.team}</TableCell>
                    <TableCell className="text-xs font-mono px-3 py-1">{r.projected}</TableCell>
                    <TableCell className="text-xs font-mono font-medium px-3 py-1">{r.actual}</TableCell>
                    <TableCell className="px-3 py-1">
                      <div className="flex gap-0.5 flex-wrap">
                        {r.flags.map((f, j) => (
                          <Badge key={j} variant="outline" className="text-[10px] px-1 py-0 bg-muted text-muted-foreground border-border">{f}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-1">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${r.hit ? 'bg-green-600/20 text-green-400 border-green-600/30' : 'bg-red-600/20 text-red-400 border-red-600/30'}`}>{r.hit ? 'HIT' : 'MISS'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
