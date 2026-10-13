import { Dumbbell, FileText, FlaskConical, Hospital, Pill, Scan, Scissors, Stethoscope, Syringe, type LucideIcon } from 'lucide-react'
import type { RecordType } from '../types'

export const TYPE_ICON: Record<RecordType, LucideIcon> = {
  visit: Stethoscope,
  lab: FlaskConical,
  imaging: Scan,
  procedure: Scissors,
  vaccine: Syringe,
  medication: Pill,
  hospital: Hospital,
  therapy: Dumbbell,
  document: FileText,
}

export function TypeIcon({ type, className }: { type: RecordType; className?: string }) {
  const Icon = TYPE_ICON[type]
  return <Icon className={className} aria-hidden />
}

/** CSS custom property so a row can color its marker/icon by record type. */
export const typeStyle = (type: RecordType) => ({ ['--t' as string]: `var(--t-${type})` })
