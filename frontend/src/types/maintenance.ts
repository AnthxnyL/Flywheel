export interface PlanItem {
  id: string
  operationType: string
  dueDate: string | null
  intervalKm: number | null
  intervalMonths: number | null
  lastDoneKm: number | null
  lastDoneDate: string | null
  notes: string | null
  nextDueKm: number | null
  nextDueDate: string | null
  status: 'ok' | 'soon' | 'overdue'
  alertKm: number | null
  alertDays: number | null
}
