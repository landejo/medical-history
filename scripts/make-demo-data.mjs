#!/usr/bin/env node
// Regenerates the fictional demo dataset in ./demo-data. Nothing here is a real person or real scan.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = 'demo-data'
rmSync(root, { recursive: true, force: true })
for (const d of ['episodes', 'records', 'attachments']) mkdirSync(join(root, d), { recursive: true })
writeFileSync(join(root, 'DEMO'), 'This folder is fictional demo data.\n')

const write = (p, obj) => writeFileSync(join(root, p), typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) + '\n')

// --- placeholder "scan" image (SVG) ---------------------------------------------------------
function scanSvg(label, seed = 1) {
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const blobs = Array.from({ length: 14 }, () => {
    const cx = 120 + rnd() * 400, cy = 80 + rnd() * 440, rx = 20 + rnd() * 90, ry = 20 + rnd() * 120
    return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${ry.toFixed(0)}" fill="#cfd6dd" opacity="${(0.08 + rnd() * 0.22).toFixed(2)}" transform="rotate(${(rnd() * 60 - 30).toFixed(0)} ${cx.toFixed(0)} ${cy.toFixed(0)})"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 600" width="640" height="600">
<rect width="640" height="600" fill="#0b0f14"/>
<rect x="80" y="40" width="480" height="520" rx="180" fill="#1a2430"/>
${blobs}
<path d="M300 120 C 330 200, 330 400, 300 480" stroke="#e8edf2" stroke-width="22" stroke-linecap="round" opacity="0.55" fill="none"/>
<path d="M300 120 C 270 200, 270 400, 300 480" stroke="#e8edf2" stroke-width="16" stroke-linecap="round" opacity="0.35" fill="none"/>
<text x="24" y="36" font-family="monospace" font-size="16" fill="#9fb0c0">${label}</text>
<text x="24" y="580" font-family="monospace" font-size="14" fill="#6b7c8c">DEMO IMAGE — synthetic placeholder, not a real scan</text>
</svg>`
}

// --- minimal valid PDF ----------------------------------------------------------------------
function tinyPdf(lines) {
  const content = ['BT', '/F1 12 Tf', '50 740 Td', '16 TL', ...lines.map((l) => `(${l.replace(/[()\\]/g, '')}) Tj T*`), 'ET'].join('\n')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return out
}

// --- profile ----------------------------------------------------------------------------------
write('profile.json', {
  name: 'Demo Patient',
  dob: '1981-06-14',
  bloodType: 'O+',
  allergies: [{ name: 'Penicillin', reaction: 'Hives', severity: 'moderate' }],
  medications: [
    { name: 'Vitamin D3', dose: '2,000 IU', frequency: 'daily', since: '2023-03-02', reason: 'Low vitamin D' },
    { name: 'Omega-3 fish oil', dose: '1 g', frequency: 'daily', since: '2022-03-01', reason: 'Cholesterol (lifestyle plan)' },
  ],
  conditions: [
    { name: 'Borderline high cholesterol', since: '2022-02-10', status: 'improving with lifestyle changes' },
    { name: 'Mild obstructive sleep apnea', since: '2025-03-18', status: 'managed with positional therapy and weight loss' },
    { name: 'Right ACL reconstruction (2024)', since: '2024-04-18', status: 'recovered' },
  ],
  careTeam: [
    { name: 'Dr. Priya Raman', role: 'Primary care', facility: 'Bayside Family Medicine', phone: '(415) 555-0142' },
    { name: 'Dr. Marcus Oyelaran', role: 'Orthopedic surgeon', facility: 'Pacific Orthopedic Institute' },
    { name: 'Dr. Elena Castillo', role: 'Sleep medicine', facility: 'Bayside Sleep Center' },
    { name: 'Dr. Hannah Zhou', role: 'Dermatology', facility: 'Marina Dermatology' },
  ],
  screenings: [
    { name: 'Colonoscopy', last: '2023-10-06', due: '2030-10-06', note: 'One small benign polyp removed; 7-year interval' },
    { name: 'Lipid panel', last: '2026-02-11', due: '2027-02-11' },
    { name: 'Skin check', last: '2025-06-03', due: '2026-06-03' },
    { name: 'Eye exam', last: '2024-08-21', due: '2026-08-21' },
    { name: 'Tetanus (Tdap) booster', last: '2021-05-12', due: '2031-05-12' },
    { name: 'Flu shot', last: '2025-10-02', due: '2026-10-01' },
  ],
  emergency: { contact: 'Sam Patient (spouse)', phone: '(415) 555-0199', notes: 'Penicillin allergy. No blood thinners.' },
})

// --- episodes ---------------------------------------------------------------------------------
write('episodes/acl-right-2024.json', {
  id: 'acl-right-2024',
  title: 'Right ACL tear and reconstruction',
  started: '2024-03-09',
  ended: '2024-11-15',
  status: 'resolved',
  kind: 'injury',
  summary:
    'Twisted the right knee during a weekend soccer game. MRI confirmed a complete ACL tear with a small medial meniscus tear. Reconstruction with a patellar tendon autograft in April 2024, followed by seven months of physical therapy. Cleared for full sport in November 2024.',
  tags: ['knee', 'orthopedics', 'surgery'],
})
write('episodes/cholesterol.json', {
  id: 'cholesterol',
  title: 'Borderline high cholesterol',
  started: '2022-02-10',
  status: 'monitoring',
  kind: 'condition',
  summary:
    'LDL first flagged at 142 mg/dL in Feb 2022. Chose a lifestyle-first plan (Mediterranean-style diet, 150 min/week of zone-2 cardio, fish oil) instead of a statin. LDL has fallen steadily each year and reached the under-100 target in 2026.',
  tags: ['heart', 'lipids', 'lifestyle'],
})
write('episodes/sleep-2025.json', {
  id: 'sleep-2025',
  title: 'Snoring, fatigue, and sleep apnea evaluation',
  started: '2025-02-19',
  status: 'active',
  kind: 'condition',
  summary:
    'Reported daytime fatigue and loud snoring. A home sleep study showed mild obstructive sleep apnea (AHI 9). Managing with positional therapy and weight loss rather than CPAP for now; repeat study planned for early 2027.',
  tags: ['sleep', 'ENT'],
})

// --- records ----------------------------------------------------------------------------------
const pcp = { name: 'Dr. Priya Raman', specialty: 'Primary care', facility: 'Bayside Family Medicine' }
const ortho = { name: 'Dr. Marcus Oyelaran', specialty: 'Orthopedic surgery', facility: 'Pacific Orthopedic Institute' }
const sleep = { name: 'Dr. Elena Castillo', specialty: 'Sleep medicine', facility: 'Bayside Sleep Center' }
const src = (portal) => ({ portal, importedOn: '2026-10-12' })

const lipids = (date, tc, ldl, hdl, tg, a1c, extra = []) => [
  { name: 'Total cholesterol', value: tc, unit: 'mg/dL', range: '< 200', high: 200, flag: tc >= 200 ? 'high' : 'normal' },
  { name: 'LDL cholesterol', value: ldl, unit: 'mg/dL', range: '< 100', high: 100, flag: ldl >= 100 ? 'high' : 'normal' },
  { name: 'HDL cholesterol', value: hdl, unit: 'mg/dL', range: '> 40', low: 40, flag: hdl < 40 ? 'low' : 'normal' },
  { name: 'Triglycerides', value: tg, unit: 'mg/dL', range: '< 150', high: 150, flag: tg >= 150 ? 'high' : 'normal' },
  { name: 'Hemoglobin A1c', value: a1c, unit: '%', range: '< 5.7', high: 5.7, flag: a1c >= 5.7 ? 'high' : 'normal' },
  ...extra,
]
const basics = (glucose, creat, alt, vitd) => [
  { name: 'Fasting glucose', value: glucose, unit: 'mg/dL', range: '70–99', low: 70, high: 99, flag: glucose > 99 ? 'high' : 'normal' },
  { name: 'Creatinine', value: creat, unit: 'mg/dL', range: '0.7–1.3', low: 0.7, high: 1.3, flag: 'normal' },
  { name: 'ALT', value: alt, unit: 'U/L', range: '7–55', low: 7, high: 55, flag: alt > 55 ? 'high' : 'normal' },
  { name: 'Vitamin D, 25-OH', value: vitd, unit: 'ng/mL', range: '30–100', low: 30, high: 100, flag: vitd < 30 ? 'low' : 'normal' },
]

const records = []
const add = (r) => records.push(r)

// 2021
add({
  id: '2021-05-12-annual-physical', date: '2021-05-12', type: 'visit', title: 'Annual physical', provider: pcp,
  synopsis: 'Routine yearly check-up. Blood pressure, weight, and exam were all normal. Tdap booster given since the last one was more than ten years ago. No concerns raised.',
  findings: [{ text: 'Blood pressure 118/76, normal', sentiment: 'positive' }, { text: 'Tdap booster administered', sentiment: 'neutral' }],
  report: '## Assessment\n\nHealthy 39-year-old male, no acute complaints. Vitals within normal limits (BP 118/76, HR 64, BMI 25.1).\n\n## Plan\n\n- Tdap booster given today (left deltoid, lot DEMO-4411).\n- Fasting labs ordered.\n- Return in 12 months.',
  tags: ['preventive'], source: src('MyChart — Bayside'),
})
add({ id: '2021-05-12-tdap', date: '2021-05-12', type: 'vaccine', title: 'Tdap booster', provider: pcp, synopsis: 'Tetanus, diphtheria, and pertussis booster. Good for ten years.', findings: [{ text: 'Next booster due 2031', sentiment: 'neutral' }], tags: ['preventive'], source: src('MyChart — Bayside') })
add({
  id: '2021-05-14-annual-labs', date: '2021-05-14', type: 'lab', title: 'Annual fasting labs', provider: pcp,
  synopsis: 'Everything in range. Cholesterol was fine this year (LDL 96). Vitamin D slightly on the low side of normal.',
  findings: [{ text: 'All results within normal range', sentiment: 'positive' }],
  values: [...lipids('2021-05-14', 184, 96, 52, 110, 5.3), ...basics(88, 0.9, 24, 31)],
  tags: ['preventive'], source: src('MyChart — Bayside'),
})

// 2022
add({
  id: '2022-01-18-urgent-care-cough', date: '2022-01-18', type: 'visit', title: 'Urgent care: persistent cough',
  provider: { name: 'Dr. Tom Ferreira', specialty: 'Urgent care', facility: 'CityMed Urgent Care' },
  synopsis: 'Three weeks of a dry cough after a cold. Lungs sounded clear but a chest X-ray was ordered to be safe. Diagnosed as post-viral bronchitis; treated with an inhaler for two weeks.',
  findings: [{ text: 'Post-viral bronchitis, no pneumonia', sentiment: 'neutral' }, { text: 'Albuterol inhaler as needed for 2 weeks', sentiment: 'neutral' }],
  tags: ['respiratory'], source: src('CityMed patient portal'),
})
add({
  id: '2022-01-18-chest-xray', date: '2022-01-18', type: 'imaging', title: 'Chest X-ray, 2 views',
  provider: { name: 'Dr. Lina Haddad', specialty: 'Radiology', facility: 'CityMed Urgent Care' },
  synopsis: 'Chest X-ray taken for a lingering cough. Lungs were clear, heart size normal, no signs of pneumonia or anything concerning.',
  findings: [{ text: 'Lungs clear, no pneumonia', sentiment: 'positive' }, { text: 'Normal heart size', sentiment: 'positive' }],
  report: '**EXAM:** Chest, PA and lateral.\n\n**INDICATION:** Cough x 3 weeks.\n\n**FINDINGS:** Lungs are clear. No focal consolidation, effusion, or pneumothorax. Cardiomediastinal silhouette is normal. Osseous structures unremarkable.\n\n**IMPRESSION:** No acute cardiopulmonary process.',
  attachments: [{ file: 'cxr-pa.svg', kind: 'image', label: 'PA view' }, { file: 'cxr-lat.svg', kind: 'image', label: 'Lateral view' }],
  tags: ['respiratory'], source: src('CityMed patient portal'),
})
add({
  id: '2022-02-08-annual-physical', date: '2022-02-08', type: 'visit', title: 'Annual physical', provider: pcp,
  synopsis: 'Routine check-up, moved earlier in the year. Weight up about 8 lb from last year. Labs ordered; cholesterol came back borderline high two days later.',
  findings: [{ text: 'Weight up 8 lb year over year', sentiment: 'watch' }],
  tags: ['preventive'], source: src('MyChart — Bayside'),
})
add({
  id: '2022-02-10-annual-labs', date: '2022-02-10', type: 'lab', title: 'Annual fasting labs', provider: pcp, episode: 'cholesterol',
  synopsis: 'LDL ("bad") cholesterol came in at 142, above the 100 target, and total cholesterol crossed 200. Everything else was normal. This is the result that started the cholesterol plan.',
  findings: [{ text: 'LDL 142 mg/dL, above target', sentiment: 'negative' }, { text: 'Total cholesterol 214, high', sentiment: 'negative' }, { text: 'Blood sugar (A1c) normal', sentiment: 'positive' }],
  values: [...lipids('2022-02-10', 214, 142, 48, 138, 5.4), ...basics(92, 0.9, 27, 29)],
  followUp: [{ text: 'Repeat lipid panel in 6 months after diet and exercise changes', due: '2022-08-10', done: true }],
  tags: ['preventive', 'lipids'], source: src('MyChart — Bayside'),
})
add({
  id: '2022-03-01-cholesterol-plan', date: '2022-03-01', type: 'visit', title: 'Cholesterol follow-up: lifestyle plan', provider: pcp, episode: 'cholesterol',
  synopsis: 'Discussed the high LDL. Because the 10-year heart risk is low, agreed to try six months of lifestyle changes before considering a statin: Mediterranean-style eating, fewer refined carbs, 150 minutes a week of moderate cardio, and daily fish oil.',
  findings: [{ text: '10-year cardiovascular risk estimated at 3.1% (low)', sentiment: 'positive' }, { text: 'Lifestyle plan instead of statin, re-check in 6 months', sentiment: 'neutral' }],
  report: '## Assessment\n\nHyperlipidemia, LDL 142. ASCVD 10-year risk 3.1%. Family history negative for premature CAD.\n\n## Plan\n\n1. Therapeutic lifestyle changes: Mediterranean diet pattern, limit saturated fat < 7% of calories, add 25–30 g/day soluble fiber.\n2. Exercise: 150 min/week moderate aerobic activity plus 2 resistance sessions.\n3. Omega-3 1 g daily.\n4. Repeat fasting lipid panel in 6 months. Consider moderate-intensity statin if LDL remains > 130.',
  tags: ['lipids', 'lifestyle'], source: src('MyChart — Bayside'),
})
add({
  id: '2022-08-16-lipid-panel', date: '2022-08-16', type: 'lab', title: 'Lipid panel, 6-month re-check', provider: pcp, episode: 'cholesterol',
  synopsis: 'Six months of diet and exercise brought LDL down from 142 to 128. Still above target, but moving the right way, so the plan continued without medication.',
  findings: [{ text: 'LDL down 14 points to 128', sentiment: 'positive' }, { text: 'Still above the < 100 target', sentiment: 'watch' }],
  values: lipids('2022-08-16', 198, 128, 51, 121, 5.4),
  tags: ['lipids'], source: src('MyChart — Bayside'),
})
add({ id: '2022-10-04-flu-shot', date: '2022-10-04', type: 'vaccine', title: 'Flu shot (2022–23)', provider: { facility: 'Walgreens pharmacy' }, synopsis: 'Seasonal influenza vaccine, quadrivalent.', tags: ['preventive'], source: src('Walgreens') })

// 2023
add({
  id: '2023-02-14-annual-physical', date: '2023-02-14', type: 'visit', title: 'Annual physical', provider: pcp,
  synopsis: 'Weight back down 6 lb. Blood pressure normal. Discussed scheduling a first colonoscopy now that routine screening starts at 45.',
  findings: [{ text: 'Weight down 6 lb', sentiment: 'positive' }, { text: 'Colonoscopy referral placed', sentiment: 'neutral' }],
  tags: ['preventive'], source: src('MyChart — Bayside'),
})
add({
  id: '2023-02-16-annual-labs', date: '2023-02-16', type: 'lab', title: 'Annual fasting labs', provider: pcp,
  synopsis: 'LDL continued to improve (119). Vitamin D was low at 22, so a daily supplement was started. Everything else normal.',
  findings: [{ text: 'LDL 119, continuing to fall', sentiment: 'positive' }, { text: 'Vitamin D low (22 ng/mL)', sentiment: 'negative' }],
  values: [...lipids('2023-02-16', 191, 119, 53, 114, 5.3), ...basics(90, 0.9, 22, 22)],
  followUp: [{ text: 'Start vitamin D3 2,000 IU daily; re-check in 12 months', due: '2024-02-16', done: true }],
  tags: ['preventive', 'lipids'], source: src('MyChart — Bayside'),
})
add({ id: '2023-03-02-vitamin-d', date: '2023-03-02', type: 'medication', title: 'Started vitamin D3 2,000 IU daily', provider: pcp, synopsis: 'Over-the-counter vitamin D3 started because the February level was low. Taken with breakfast.', tags: ['supplement'], source: src('Self-reported') })
add({ id: '2023-09-28-flu-shot', date: '2023-09-28', type: 'vaccine', title: 'Flu shot (2023–24)', provider: { facility: 'Walgreens pharmacy' }, synopsis: 'Seasonal influenza vaccine.', tags: ['preventive'], source: src('Walgreens') })
add({
  id: '2023-10-06-colonoscopy', date: '2023-10-06', type: 'procedure', title: 'Screening colonoscopy',
  provider: { name: 'Dr. Aisha Bello', specialty: 'Gastroenterology', facility: 'Bayside Endoscopy Center' },
  synopsis: 'First routine colonoscopy. One small (4 mm) polyp was found and removed; the biopsy came back as a benign tubular adenoma, the common kind. Because of it, the next colonoscopy is recommended in 7 years instead of 10.',
  findings: [{ text: 'One 4 mm polyp removed, benign (tubular adenoma)', sentiment: 'watch' }, { text: 'No other abnormalities; good prep quality', sentiment: 'positive' }, { text: 'Repeat colonoscopy in 7 years (2030)', sentiment: 'neutral' }],
  reportFile: 'procedure-report.pdf',
  attachments: [{ file: 'procedure-report.pdf', kind: 'pdf', label: 'Procedure report' }, { file: 'pathology.md', kind: 'document', label: 'Pathology report' }],
  followUp: [{ text: 'Repeat colonoscopy', due: '2030-10-06' }],
  tags: ['preventive', 'GI'], source: src('MyChart — Bayside'),
})

// 2024 — ACL episode
add({
  id: '2024-03-09-urgent-care-knee', date: '2024-03-09', type: 'visit', title: 'Urgent care: right knee injury', episode: 'acl-right-2024',
  provider: { name: 'Dr. Tom Ferreira', specialty: 'Urgent care', facility: 'CityMed Urgent Care' },
  synopsis: 'Felt a pop in the right knee while pivoting during soccer; the knee swelled within an hour. X-rays showed no fracture. Exam suggested a ligament injury, so an MRI and orthopedic referral were ordered. Sent home with a brace and crutches.',
  findings: [{ text: 'Suspected ACL injury (positive Lachman test)', sentiment: 'negative' }, { text: 'No fracture on X-ray', sentiment: 'positive' }],
  attachments: [{ file: 'knee-xray-ap.svg', kind: 'image', label: 'Knee X-ray, AP' }],
  tags: ['knee'], source: src('CityMed patient portal'),
})
add({
  id: '2024-03-14-knee-mri', date: '2024-03-14', type: 'imaging', title: 'MRI, right knee', episode: 'acl-right-2024',
  provider: { name: 'Dr. Lina Haddad', specialty: 'Radiology', facility: 'Pacific Imaging' },
  synopsis: 'MRI confirmed a complete tear of the ACL and a small tear of the inner (medial) meniscus. The other ligaments and cartilage looked healthy, which makes surgical repair more straightforward.',
  findings: [{ text: 'Complete ACL tear', sentiment: 'negative' }, { text: 'Small medial meniscus tear (posterior horn)', sentiment: 'negative' }, { text: 'PCL, MCL, LCL and cartilage intact', sentiment: 'positive' }],
  report: '**EXAM:** MRI right knee without contrast.\n\n**FINDINGS:**\n\n- *ACL:* Complete disruption of the mid-substance fibers with abnormal horizontal orientation. Associated bone marrow edema in the lateral femoral condyle and posterolateral tibial plateau (classic pivot-shift pattern).\n- *Menisci:* Vertical longitudinal tear of the posterior horn of the medial meniscus, 8 mm. Lateral meniscus intact.\n- *PCL, MCL, LCL:* Intact.\n- *Cartilage:* Preserved. No full-thickness defects.\n- *Joint:* Moderate effusion.\n\n**IMPRESSION:**\n\n1. Complete ACL tear with typical bone contusion pattern.\n2. Posterior horn medial meniscus tear.\n3. Moderate joint effusion.',
  attachments: [{ file: 'mri-sag-t2.svg', kind: 'image', label: 'Sagittal T2' }, { file: 'mri-cor-pd.svg', kind: 'image', label: 'Coronal PD' }, { file: 'mri-ax.svg', kind: 'image', label: 'Axial' }],
  tags: ['knee'], source: src('Pacific Imaging portal'),
})
add({
  id: '2024-03-21-ortho-consult', date: '2024-03-21', type: 'visit', title: 'Orthopedic consult', provider: ortho, episode: 'acl-right-2024',
  synopsis: 'Reviewed the MRI. Because of an active lifestyle and the meniscus tear, surgery was recommended over rehab alone. Chose a patellar tendon autograft. Three weeks of "prehab" first to reduce swelling and restore range of motion.',
  findings: [{ text: 'ACL reconstruction recommended', sentiment: 'neutral' }, { text: 'Prehab for 3–4 weeks before surgery', sentiment: 'neutral' }],
  report: '## Assessment\n\nRight knee ACL rupture with medial meniscus tear in a 42-year-old recreational athlete. Full extension lacking 5°, flexion 110°, moderate effusion.\n\n## Plan\n\n- Prehab PT 3x/week: effusion control, quad activation, ROM to 0–130.\n- ACL reconstruction with bone-patellar tendon-bone autograft and meniscal repair, target mid-April.\n- Reviewed risks: infection, stiffness, graft failure (~5%), anterior knee pain.',
  tags: ['knee'], source: src('Pacific Ortho portal'),
})
add({
  id: '2024-04-18-acl-reconstruction', date: '2024-04-18', type: 'procedure', title: 'ACL reconstruction + meniscus repair', provider: ortho, episode: 'acl-right-2024',
  synopsis: 'Outpatient surgery under general anesthesia. The torn ACL was replaced with a graft from the kneecap tendon, and the meniscus tear was stitched. No complications; home the same day with a locked brace and a nerve block for pain.',
  findings: [{ text: 'Surgery completed without complications', sentiment: 'positive' }, { text: 'Meniscus repaired (not trimmed), so weight-bearing limited 4 weeks', sentiment: 'watch' }],
  reportFile: 'operative-report.md',
  attachments: [{ file: 'operative-report.md', kind: 'document', label: 'Operative report' }, { file: 'arthroscopy-1.svg', kind: 'image', label: 'Arthroscopic view: graft in place' }],
  tags: ['knee', 'surgery'], source: src('Pacific Ortho portal'),
})
add({
  id: '2024-05-02-post-op', date: '2024-05-02', type: 'visit', title: 'Post-op visit, 2 weeks', provider: ortho, episode: 'acl-right-2024',
  synopsis: 'Incisions healing well, stitches removed. Full extension already achieved, which is the most important early milestone. Cleared to start formal physical therapy.',
  findings: [{ text: 'Full extension achieved at 2 weeks', sentiment: 'positive' }, { text: 'No signs of infection', sentiment: 'positive' }],
  tags: ['knee'], source: src('Pacific Ortho portal'),
})
add({
  id: '2024-06-20-pt-progress', date: '2024-06-20', type: 'therapy', title: 'Physical therapy progress note, week 9', episode: 'acl-right-2024',
  provider: { name: 'Jordan Lee, DPT', specialty: 'Physical therapy', facility: 'Bayside Sports PT' },
  synopsis: 'Range of motion back to normal. Quad strength on the right is about 65% of the left; the goal before running is 80%. Walking without a limp. Stationary bike and leg press progressing.',
  findings: [{ text: 'ROM 0–135°, normal', sentiment: 'positive' }, { text: 'Quad strength 65% of uninjured side (goal 80% to run)', sentiment: 'watch' }],
  tags: ['knee', 'rehab'], source: src('Bayside Sports PT'),
})
add({
  id: '2024-08-21-eye-exam', date: '2024-08-21', type: 'visit', title: 'Routine eye exam',
  provider: { name: 'Dr. Kevin Park', specialty: 'Optometry', facility: 'Marina Vision' },
  synopsis: 'Routine eye exam. Mild nearsightedness unchanged; glasses prescription the same. Retina and eye pressure normal.',
  findings: [{ text: 'Eye pressure and retina normal', sentiment: 'positive' }],
  tags: ['preventive', 'eyes'], source: src('Marina Vision'),
})
add({
  id: '2024-09-12-ortho-5mo', date: '2024-09-12', type: 'visit', title: 'Ortho follow-up, 5 months', provider: ortho, episode: 'acl-right-2024',
  synopsis: 'Knee stable on exam, strength at 85% of the other side. Cleared to begin straight-line running and a return-to-sport program with PT.',
  findings: [{ text: 'Graft stable, cleared for running', sentiment: 'positive' }],
  tags: ['knee'], source: src('Pacific Ortho portal'),
})
add({ id: '2024-10-09-flu-covid', date: '2024-10-09', type: 'vaccine', title: 'Flu shot + COVID-19 booster (2024–25)', provider: { facility: 'Walgreens pharmacy' }, synopsis: 'Seasonal flu vaccine and updated COVID-19 booster, one in each arm.', tags: ['preventive'], source: src('Walgreens') })
add({
  id: '2024-11-15-return-to-sport', date: '2024-11-15', type: 'visit', title: 'Return-to-sport clearance', provider: ortho, episode: 'acl-right-2024',
  synopsis: 'Passed the hop and strength tests (right leg within 90% of left). Cleared for full sport including soccer. Advised to keep doing the prevention exercises long term since the re-tear risk is highest in the first two years.',
  findings: [{ text: 'Cleared for full sport', sentiment: 'positive' }, { text: 'Continue ACL prevention program; re-tear risk highest for 2 years', sentiment: 'watch' }],
  tags: ['knee'], source: src('Pacific Ortho portal'),
})

// 2024 annual
add({
  id: '2024-02-20-annual-labs', date: '2024-02-20', type: 'lab', title: 'Annual fasting labs', provider: pcp,
  synopsis: 'LDL 112, still trending down. Vitamin D back to normal (38) on the supplement. Blood sugar, kidney and liver all normal.',
  findings: [{ text: 'LDL 112, close to target', sentiment: 'positive' }, { text: 'Vitamin D normalized (38 ng/mL)', sentiment: 'positive' }],
  values: [...lipids('2024-02-20', 186, 112, 55, 105, 5.4), ...basics(89, 0.9, 25, 38)],
  tags: ['preventive', 'lipids'], source: src('MyChart — Bayside'),
})

// 2025
add({
  id: '2025-02-11-annual-labs', date: '2025-02-11', type: 'lab', title: 'Annual fasting labs', provider: pcp,
  synopsis: 'LDL 104, nearly at target. Fasting glucose crept up to 101, just over the line; worth watching with the sleep and weight picture. Vitamin D fine.',
  findings: [{ text: 'LDL 104, nearly at target', sentiment: 'positive' }, { text: 'Fasting glucose 101, slightly high', sentiment: 'watch' }],
  values: [...lipids('2025-02-11', 181, 104, 56, 118, 5.6), ...basics(101, 1.0, 29, 41)],
  tags: ['preventive', 'lipids'], source: src('MyChart — Bayside'),
})
add({
  id: '2025-02-19-pcp-fatigue', date: '2025-02-19', type: 'visit', title: 'Fatigue and snoring', provider: pcp, episode: 'sleep-2025',
  synopsis: 'Reported waking unrefreshed and loud snoring noticed by partner. Thyroid was normal on recent labs. A home sleep test was ordered to check for sleep apnea.',
  findings: [{ text: 'Home sleep study ordered', sentiment: 'neutral' }, { text: 'STOP-BANG score 4 (intermediate risk)', sentiment: 'watch' }],
  tags: ['sleep'], source: src('MyChart — Bayside'),
})
add({
  id: '2025-03-18-sleep-study', date: '2025-03-18', type: 'procedure', title: 'Home sleep apnea test', provider: sleep, episode: 'sleep-2025',
  synopsis: 'Overnight test at home with a nasal sensor and finger oxygen monitor. Showed mild sleep apnea: breathing paused or shallowed about 9 times per hour, mostly when sleeping on the back. Oxygen dipped to 88% at the lowest point.',
  findings: [{ text: 'Mild obstructive sleep apnea (AHI 9.2/hr)', sentiment: 'negative' }, { text: 'Much worse on back (AHI 18) than on side (AHI 4)', sentiment: 'watch' }, { text: 'Lowest oxygen 88%', sentiment: 'watch' }],
  values: [
    { name: 'AHI (events/hr)', value: 9.2, range: '< 5', high: 5, flag: 'high' },
    { name: 'AHI supine', value: 18.1, range: '< 5', high: 5, flag: 'high' },
    { name: 'AHI non-supine', value: 4.0, range: '< 5', high: 5, flag: 'normal' },
    { name: 'Lowest SpO2', value: 88, unit: '%', range: '> 90', low: 90, flag: 'low' },
  ],
  reportFile: 'sleep-study-report.md',
  attachments: [{ file: 'sleep-study-report.md', kind: 'document', label: 'Sleep study report' }],
  tags: ['sleep'], source: src('Bayside Sleep Center'),
})
add({
  id: '2025-04-10-sleep-consult', date: '2025-04-10', type: 'visit', title: 'Sleep medicine consult', provider: sleep, episode: 'sleep-2025',
  synopsis: 'Because the apnea is mild and mostly positional, agreed to try positional therapy (side-sleeping device) and a weight-loss target of 10 lb before trying CPAP. Repeat home study in about a year.',
  findings: [{ text: 'Positional therapy + weight loss first; CPAP if no improvement', sentiment: 'neutral' }],
  followUp: [{ text: 'Repeat home sleep study', due: '2027-01-15' }],
  tags: ['sleep'], source: src('Bayside Sleep Center'),
})
add({
  id: '2025-06-03-skin-check', date: '2025-06-03', type: 'visit', title: 'Full-body skin check',
  provider: { name: 'Dr. Hannah Zhou', specialty: 'Dermatology', facility: 'Marina Dermatology' },
  synopsis: 'Annual skin exam. One mole on the upper back was photographed to watch over time; it looked benign. No biopsies needed.',
  findings: [{ text: 'No suspicious lesions', sentiment: 'positive' }, { text: 'Mole on upper back photographed for monitoring', sentiment: 'watch' }],
  attachments: [{ file: 'mole-upper-back.svg', kind: 'image', label: 'Dermoscopy photo, upper back' }],
  tags: ['preventive', 'skin'], source: src('Marina Dermatology'),
})
add({
  id: '2025-07-22-sleep-followup', date: '2025-07-22', type: 'visit', title: 'Sleep follow-up, 3 months', provider: sleep, episode: 'sleep-2025',
  synopsis: 'Down 7 lb and using the side-sleeping device nightly. Snoring much reduced per partner and daytime energy better. Plan unchanged; continue and recheck.',
  findings: [{ text: 'Symptoms improved with positional therapy and 7 lb weight loss', sentiment: 'positive' }],
  tags: ['sleep'], source: src('Bayside Sleep Center'),
})
add({ id: '2025-10-02-flu-shot', date: '2025-10-02', type: 'vaccine', title: 'Flu shot (2025–26)', provider: { facility: 'Walgreens pharmacy' }, synopsis: 'Seasonal influenza vaccine.', tags: ['preventive'], source: src('Walgreens') })

// 2026
add({
  id: '2026-02-11-annual-labs', date: '2026-02-11', type: 'lab', title: 'Annual fasting labs', provider: pcp, episode: 'cholesterol',
  synopsis: 'LDL reached 98, under the 100 target for the first time since 2021, four years into the lifestyle plan with no medication. Fasting glucose back to normal. Everything else fine.',
  findings: [{ text: 'LDL 98, at target without medication', sentiment: 'positive' }, { text: 'Fasting glucose back to normal (94)', sentiment: 'positive' }],
  values: [...lipids('2026-02-11', 172, 98, 58, 96, 5.5), ...basics(94, 0.9, 23, 44)],
  tags: ['preventive', 'lipids'], source: src('MyChart — Bayside'),
})
add({
  id: '2026-02-13-annual-physical', date: '2026-02-13', type: 'visit', title: 'Annual physical', provider: pcp,
  synopsis: 'Weight down 12 lb from the 2025 peak. Blood pressure 116/74. Reviewed the cholesterol win and the sleep plan. Shingles vaccine recommended at 50 (2031). No changes to medications.',
  findings: [{ text: 'Blood pressure 116/74, weight down 12 lb', sentiment: 'positive' }],
  tags: ['preventive'], source: src('MyChart — Bayside'),
})

for (const r of records) write(`records/${r.id}.json`, r)

// --- attachments ------------------------------------------------------------------------------
const att = (id, file, content) => {
  mkdirSync(join(root, 'attachments', id), { recursive: true })
  write(`attachments/${id}/${file}`, content)
}
att('2022-01-18-chest-xray', 'cxr-pa.svg', scanSvg('CHEST PA  2022-01-18', 3))
att('2022-01-18-chest-xray', 'cxr-lat.svg', scanSvg('CHEST LAT  2022-01-18', 7))
att('2024-03-09-urgent-care-knee', 'knee-xray-ap.svg', scanSvg('R KNEE AP  2024-03-09', 11))
att('2024-03-14-knee-mri', 'mri-sag-t2.svg', scanSvg('MRI R KNEE SAG T2  2024-03-14', 13))
att('2024-03-14-knee-mri', 'mri-cor-pd.svg', scanSvg('MRI R KNEE COR PD  2024-03-14', 17))
att('2024-03-14-knee-mri', 'mri-ax.svg', scanSvg('MRI R KNEE AXIAL  2024-03-14', 19))
att('2024-04-18-acl-reconstruction', 'arthroscopy-1.svg', scanSvg('ARTHROSCOPY  GRAFT IN PLACE', 23))
att('2025-06-03-skin-check', 'mole-upper-back.svg', scanSvg('DERMOSCOPY  UPPER BACK', 29))
att('2023-10-06-colonoscopy', 'procedure-report.pdf', tinyPdf([
  'DEMO DOCUMENT - fictional', '', 'COLONOSCOPY PROCEDURE REPORT', 'Date: 2023-10-06   Endoscopist: Dr. Aisha Bello',
  '', 'Indication: Average-risk screening, age 45.', 'Prep quality: Good (Boston 8/9).', 'Extent: Cecum reached; ileocecal valve identified.',
  'Findings: One 4 mm sessile polyp, ascending colon, removed with cold snare.', 'No other lesions. Normal rectal mucosa.',
  'Recommendation: Repeat colonoscopy in 7 years pending pathology.',
]))
att('2023-10-06-colonoscopy', 'pathology.md', '# Surgical Pathology Report\n\n*Demo document, fictional.*\n\n**Specimen:** Polyp, ascending colon, cold snare.\n\n**Diagnosis:** Tubular adenoma, 4 mm. Negative for high-grade dysplasia. Margins not applicable (fragmented).\n\n**Comment:** Low-risk adenoma. Surveillance per current guidelines (7–10 years).\n')
att('2024-04-18-acl-reconstruction', 'operative-report.md', '# Operative Report\n\n*Demo document, fictional.*\n\n**Procedure:** Right knee arthroscopy, ACL reconstruction with bone-patellar tendon-bone autograft, repair of posterior horn medial meniscus.\n\n**Surgeon:** Dr. Marcus Oyelaran  \n**Anesthesia:** General with adductor canal block\n\n## Findings\n\nComplete mid-substance ACL rupture. 8 mm vertical tear, posterior horn medial meniscus, red-white zone. Articular cartilage Outerbridge grade 0–1 throughout.\n\n## Procedure\n\n1. Diagnostic arthroscopy confirmed findings.\n2. Meniscal repair with two all-inside sutures.\n3. Central-third patellar tendon graft harvested (10 mm).\n4. Femoral and tibial tunnels drilled; graft fixed with interference screws. Graft taut through full range with no impingement.\n\n**Complications:** None. **EBL:** Minimal.\n\n## Post-op orders\n\nBrace locked in extension for ambulation 2 weeks. Toe-touch weight bearing 4 weeks (meniscal repair). PT to begin at 2 weeks.\n')
att('2025-03-18-sleep-study', 'sleep-study-report.md', '# Home Sleep Apnea Test\n\n*Demo document, fictional.*\n\n**Device:** Type III portable monitor  \n**Recording time:** 7 h 12 min, 6 h 40 min valid\n\n| Metric | Value |\n|---|---|\n| AHI | 9.2 /hr |\n| AHI supine | 18.1 /hr |\n| AHI non-supine | 4.0 /hr |\n| Supine time | 41% |\n| ODI 3% | 8.7 /hr |\n| Mean SpO2 | 94% |\n| Nadir SpO2 | 88% |\n\n## Interpretation\n\nMild obstructive sleep apnea with a strong positional component. Consider positional therapy and weight reduction as first-line; CPAP if symptoms persist or AHI worsens.\n')

console.log(`wrote ${records.length} records to ${root}/`)
