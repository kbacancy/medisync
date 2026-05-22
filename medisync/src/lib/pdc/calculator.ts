import type { RiskLevel, AdherenceLog } from '@/types'
import { format, subDays, parseISO } from 'date-fns'

export type DoseStatus = 'taken' | 'skipped' | 'snoozed' | 'missed' | 'late' | 'pending'

export interface PDCInput {
  dispensingDates: Date[]
  daysSupply: number[]
  periodStart: Date
  periodEnd: Date
}

export function calculatePDC(input: PDCInput): number {
  const { dispensingDates, daysSupply, periodStart, periodEnd } = input
  const periodStartTime = periodStart.getTime()
  const periodEndTime = periodEnd.getTime()
  const msPerDay = 24 * 60 * 60 * 1000
  const periodDays = Math.round((periodEndTime - periodStartTime) / msPerDay) + 1
  if (periodDays <= 0) return 0
  const coveredDays = new Set<number>()
  for (let i = 0; i < dispensingDates.length; i++) {
    const fillStart = dispensingDates[i].getTime()
    const supply = daysSupply[i] ?? 0
    const fillEnd = fillStart + supply * msPerDay
    const clampedStart = Math.max(fillStart, periodStartTime)
    const clampedEnd = Math.min(fillEnd, periodEndTime + msPerDay)
    for (let day = clampedStart; day < clampedEnd; day += msPerDay) {
      const dayIndex = Math.floor((day - periodStartTime) / msPerDay)
      if (dayIndex >= 0 && dayIndex < periodDays) coveredDays.add(dayIndex)
    }
  }
  return Math.round((coveredDays.size / periodDays) * 100)
}

export function getPDCRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'LOW'
  if (score >= 65) return 'MODERATE'
  if (score >= 50) return 'HIGH'
  return 'CRITICAL'
}

export function calculateStreak(logs: AdherenceLog[]): number {
  const takenDays = new Set(
    logs
      .filter((l) => l.status === 'taken')
      .map((l) => format(new Date(l.scheduled_time), 'yyyy-MM-dd'))
  )
  let streak = 0
  let check = new Date()
  while (takenDays.has(format(check, 'yyyy-MM-dd'))) {
    streak++
    check = subDays(check, 1)
  }
  return streak
}

export function calculatePDCByPrescription(
  logs: AdherenceLog[],
  prescriptionId: string,
  startDate: string,
  endDate: string
): number {
  const rxLogs = logs.filter(
    (l) => l.prescription_id === prescriptionId && l.status === 'taken'
  )
  if (!rxLogs.length) return 0
  return calculatePDC({
    dispensingDates: rxLogs.map((l) => new Date(l.scheduled_time)),
    daysSupply: rxLogs.map(() => 1),
    periodStart: parseISO(startDate),
    periodEnd: parseISO(endDate),
  })
}

export function buildHeatmapData(
  logs: AdherenceLog[],
  days: number
): { date: string; status: DoseStatus | 'none' }[] {
  const today = new Date()
  const result: { date: string; status: DoseStatus | 'none' }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayLogs = logs.filter(
      (l) => format(new Date(l.scheduled_time), 'yyyy-MM-dd') === dateStr
    )

    let status: DoseStatus | 'none' = 'none'
    if (dayLogs.length > 0) {
      if (dayLogs.some((l) => l.status === 'taken')) status = 'taken'
      else if (dayLogs.some((l) => l.status === 'missed')) status = 'missed'
      else if (dayLogs.some((l) => l.status === 'skipped')) status = 'skipped'
      else if (dayLogs.some((l) => l.status === 'snoozed')) status = 'snoozed'
      else status = dayLogs[0].status as DoseStatus
    }

    result.push({ date: dateStr, status })
  }

  return result
}
