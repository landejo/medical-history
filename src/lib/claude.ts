import Anthropic from '@anthropic-ai/sdk'
import type { DataIndex, MedRecord } from '../types'
import type { Settings } from './settings'
import { formatDate } from './format'
import { RECORD_TYPE_LABEL } from '../types'


function recordBlock(r: MedRecord): string {
  const lines = [`### ${formatDate(r.date)} — ${r.title} [${RECORD_TYPE_LABEL[r.type]}] (id: ${r.id})`]
  const who = [r.provider?.name, r.provider?.specialty, r.provider?.facility].filter(Boolean).join(', ')
  if (who) lines.push(`Provider: ${who}`)
  if (r.episode) lines.push(`Episode: ${r.episode}`)
  lines.push(`Summary: ${r.synopsis}`)
  if (r.findings?.length) lines.push('Findings: ' + r.findings.map((f) => `${f.text} (${f.sentiment})`).join('; '))
  if (r.values?.length) lines.push('Results: ' + r.values.map((v) => `${v.name} ${v.value}${v.unit ? ' ' + v.unit : ''}${v.range ? ' (ref ' + v.range + ')' : ''}${v.flag && v.flag !== 'normal' ? ' ' + v.flag.toUpperCase() : ''}`).join('; '))
  if (r.followUp?.length) lines.push('Follow-up: ' + r.followUp.map((f) => `${f.text}${f.due ? ' due ' + f.due : ''}${f.done ? ' (done)' : ''}`).join('; '))
  if (r.report) lines.push('Report:\n' + r.report)
  return lines.join('\n')
}

/** Everything Claude needs to answer questions: profile, episodes, and every record in full. */
export function buildSystemPrompt(index: DataIndex, focus?: MedRecord): string {
  const p = index.profile
  const parts: string[] = []
  parts.push(`You are a careful, warm health explainer inside "${p.name || 'the user'}'s Medical History", a personal medical-records app. The user is the patient reading their own records. Explain what results and reports mean in plain language, point out patterns across time, and suggest sensible lifestyle questions to raise with their doctors. Be concrete and cite the specific records (by date and title) you draw on. Be honest about uncertainty. You are not their physician: don't diagnose or change treatment, and say clearly when something warrants a conversation with a clinician, and urgently so for red-flag symptoms. Keep answers focused; use short paragraphs or bullets, never headers for short answers.${index.demo ? ' NOTE: this dataset is fictional demo data.' : ''}`)
  parts.push(`## Profile\nName: ${p.name}${p.dob ? `\nDate of birth: ${p.dob}` : ''}${p.bloodType ? `\nBlood type: ${p.bloodType}` : ''}`)
  if (p.conditions?.length) parts.push('Conditions: ' + p.conditions.map((c) => `${c.name}${c.since ? ' since ' + c.since : ''}${c.status ? ' (' + c.status + ')' : ''}`).join('; '))
  if (p.medications?.length) parts.push('Medications: ' + p.medications.map((m) => `${m.name} ${m.dose ?? ''} ${m.frequency ?? ''}${m.reason ? ' for ' + m.reason : ''}`.trim()).join('; '))
  if (p.allergies?.length) parts.push('Allergies: ' + p.allergies.map((a) => `${a.name}${a.reaction ? ' (' + a.reaction + ')' : ''}`).join('; '))
  if (p.careTeam?.length) parts.push('Care team: ' + p.careTeam.map((c) => `${c.name} (${c.role}${c.facility ? ', ' + c.facility : ''})`).join('; '))
  if (p.screenings?.length) parts.push('Screenings: ' + p.screenings.map((s) => `${s.name} last ${s.last ?? '?'} due ${s.due ?? '?'}`).join('; '))
  if (index.episodes.length) {
    parts.push('## Episodes (groups of related records)\n' + index.episodes.map((e) => `- ${e.id}: ${e.title} (${e.status}, ${e.started}${e.ended ? ' to ' + e.ended : ' to now'}). ${e.summary}`).join('\n'))
  }
  parts.push('## Records (newest first)\n' + index.records.map(recordBlock).join('\n\n'))
  if (focus) parts.push(`## Currently open\nThe user is looking at the record "${focus.title}" from ${formatDate(focus.date)} (id: ${focus.id}). Assume questions refer to it unless they say otherwise.`)
  parts.push(`Today's date: ${new Date().toISOString().slice(0, 10)}.`)
  return parts.join('\n\n')
}

export function makeClient(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

/** Streams a reply, yielding text deltas. Throws Anthropic.APIError subclasses on failure. */
export async function* streamReply(
  client: Anthropic,
  model: Settings['anthropic']['model'],
  system: string,
  messages: Anthropic.MessageParam[],
  signal: AbortSignal,
): AsyncGenerator<string> {
  const base = {
    model,
    max_tokens: 8000,
    system: [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }],
    messages,
    output_config: { effort: 'medium' as const },
  }
  // Server-side refusal fallbacks exist for Opus/Sonnet on the Claude API; Haiku has none.
  const stream =
    model === 'claude-haiku-5-5'
      ? client.messages.stream(base, { signal })
      : client.beta.messages.stream({ ...base, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, { signal })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') yield event.delta.text
    if (event.type === 'message_delta' && event.delta.stop_reason === 'refusal') yield '\n\n_(The model declined to answer this request.)_'
  }
}

export function describeError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'That API key was rejected. Check it in Settings.'
  if (e instanceof Anthropic.RateLimitError) return 'Rate limited by the API. Wait a moment and try again.'
  if (e instanceof Anthropic.BadRequestError) return `The API rejected the request: ${e.message}`
  if (e instanceof Anthropic.APIConnectionError) return 'Could not reach the Anthropic API. Check your connection.'
  if (e instanceof Anthropic.APIError) return `API error ${e.status}: ${e.message}`
  if (e instanceof Error) return e.message
  return String(e)
}
