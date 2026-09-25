/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Letter document generation (UC40–UC42).
 *
 * Builds a self-contained, A4-styled HTML document for an official letter and
 * opens it in a new window to print or save as PDF. The output is intentionally
 * dependency-free (no PDF library): the browser's native print dialog produces
 * either a physical printout or a "Save as PDF" file, so it works on any machine
 * and looks exactly like what is rendered.
 *
 * The on-screen preview in `StudentLetterGeneration` mirrors this layout so the
 * student sees the same thing they print. When the real template wording arrives
 * from the supervisor, update the template fields in `src/mocks/letters.ts`
 * (and the shared letterhead constants below) — the print output follows.
 */

/** Static faculty letterhead details, shared by the preview and the printout. */
export const LETTERHEAD = {
  logoPath: '/um-logo.png',
  university: 'Universiti Malaya',
  faculty: 'Faculty of Computer Science & Information Technology',
  addressLines: [
    'Academic Affairs Office, Level 4',
    '50603 Kuala Lumpur, Malaysia',
    '+603-7967 6300  |  pg.fsktm@um.edu.my',
  ],
  recipient: 'TO WHOM IT MAY CONCERN',
  disclaimer:
    "This letter is issued upon the student's request for official purposes only. " +
    'Any alteration to this document shall render it invalid.',
  signatoryName: 'Dean of Postgraduate Studies',
  signatoryOffice: 'FSKTM Office Executive Secretariat',
} as const;

/** Everything needed to render one letter (body is already substituted). */
export interface LetterData {
  templateName: string;
  refNo: string;
  date: string;
  /** Letter body with placeholders already filled in. Blank lines = paragraphs. */
  bodyParagraphs: string;
  /** Used only to name the saved PDF file. */
  studentName: string;
  matricNumber: string;
}

/** The placeholder tags a template author can use, with friendly labels. */
export const LETTER_PLACEHOLDERS: ReadonlyArray<{ tag: string; label: string }> = [
  { tag: '{{STUDENT_NAME}}', label: 'Student Name' },
  { tag: '{{STUDENT_ID}}', label: 'Matric Number' },
  { tag: '{{PROGRAMME_NAME}}', label: 'Programme' },
  { tag: '{{CURRENT_STATUS}}', label: 'Current Status' },
  { tag: '{{SUPERVISOR_NAME}}', label: 'Supervisor' },
  { tag: '{{REFERENCE_NUMBER}}', label: 'Reference No.' },
  { tag: '{{CURRENT_DATE}}', label: 'Date' },
  // Visa / immigration + programme fields. Filled from the student's registry
  // record (StudentRegistry) when available, else a blank fill-in line.
  { tag: '{{PASSPORT_NUMBER}}', label: 'Passport No.' },
  { tag: '{{COUNTRY}}', label: 'Country' },
  { tag: '{{PROGRAMME_MODE}}', label: 'Programme Mode' },
  { tag: '{{FIELD_OF_RESEARCH}}', label: 'Field of Research' },
  { tag: '{{MODE_OF_STUDY}}', label: 'Mode of Study' },
  { tag: '{{INITIAL_SEMESTER}}', label: 'Initial Semester' },
  { tag: '{{CURRENT_SEMESTER}}', label: 'Current Semester' },
  { tag: '{{MAX_SEMESTER}}', label: 'Maximum Semester' },
  { tag: '{{EXPECTED_COMPLETION}}', label: 'Expected Completion' },
];

/**
 * Fallback for a placeholder we have no value for: a blank line the postgraduate
 * office completes by hand. Registry-backed fields (passport, country, semesters…)
 * are normally filled from the student's StudentRegistry record, but fall back to
 * this line when a student has no registry details captured yet.
 */
const FILL_IN_BLANK = '____________';

/** The values substituted into a template's placeholders for one student. The
 *  registry-backed fields are optional — a blank fill-in line is used when absent. */
export interface PlaceholderValues {
  studentName: string;
  matricNumber: string;
  programName: string;
  currentStatus: string;
  supervisorName?: string;
  referenceNumber: string;
  date: string;
  // Registry-backed (StudentRegistry) fields.
  passportNumber?: string;
  country?: string;
  programmeMode?: string;
  fieldOfResearch?: string;
  modeOfStudy?: string;
  initialSemester?: string;
  currentSemester?: string;
  maxSemester?: string;
  expectedCompletion?: string;
}

/** Replace every `{{TAG}}` in `content` with the matching student value. */
export function substitutePlaceholders(content: string, values: PlaceholderValues): string {
  const map: Record<string, string | undefined> = {
    '{{STUDENT_NAME}}': values.studentName,
    '{{STUDENT_ID}}': values.matricNumber,
    '{{PROGRAMME_NAME}}': values.programName,
    '{{CURRENT_STATUS}}': values.currentStatus,
    '{{SUPERVISOR_NAME}}': values.supervisorName,
    '{{REFERENCE_NUMBER}}': values.referenceNumber,
    '{{CURRENT_DATE}}': values.date,
    // Registry-backed fields (filled from the student's StudentRegistry record).
    '{{PASSPORT_NUMBER}}': values.passportNumber,
    '{{COUNTRY}}': values.country,
    '{{PROGRAMME_MODE}}': values.programmeMode,
    '{{FIELD_OF_RESEARCH}}': values.fieldOfResearch,
    '{{MODE_OF_STUDY}}': values.modeOfStudy,
    '{{INITIAL_SEMESTER}}': values.initialSemester,
    '{{CURRENT_SEMESTER}}': values.currentSemester,
    '{{MAX_SEMESTER}}': values.maxSemester,
    '{{EXPECTED_COMPLETION}}': values.expectedCompletion,
  };

  return content.replace(/\{\{[A-Z_]+\}\}/g, (token) => {
    // Unknown tags are left untouched so authors can see what they mistyped.
    if (!(token in map)) return token;
    // Known tag with no value (e.g. an unfilled field) → a line to complete by hand.
    const value = map[token];
    return value && value.trim() ? value : FILL_IN_BLANK;
  });
}

/**
 * Apply the inline text markup to one line: `**bold**`, `__underline__`,
 * `*italic*`. The text is HTML-escaped first, then only our own safe tags are
 * added — so it's safe to inject with `dangerouslySetInnerHTML` / into the print
 * window. When `highlightPlaceholders` is on (the staff editor preview), any
 * leftover `{{TAG}}` is wrapped in a highlight chip.
 */
function applyInlineMarkup(raw: string, highlightPlaceholders: boolean): string {
  let s = esc(raw);
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>'); // bold (before italic)
  s = s.replace(/__([^_]+?)__/g, '<u>$1</u>'); // underline (double underscore)
  s = s.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>'); // italic (single asterisk)
  if (highlightPlaceholders) {
    s = s.replace(
      /\{\{[A-Z_]+\}\}/g,
      (tag) =>
        `<span style="background:#0c1424;color:#a5b4fc;font-family:ui-monospace,monospace;` +
        `font-weight:800;font-size:.85em;padding:1px 6px;border-radius:4px;">${tag}</span>`,
    );
  }
  return s;
}

/**
 * Render a letter body (with the lightweight markup authored in the template
 * editor) into a safe HTML string. Shared by the staff editor preview, the
 * student preview, and the printed PDF so all three look identical.
 *
 * Supported markup: `**bold**`, `*italic*`, `__underline__`, blank lines start a
 * new paragraph, and lines beginning with `- ` become a bullet list.
 */
export function renderLetterBodyHtml(
  body: string,
  opts?: { highlightPlaceholders?: boolean },
): string {
  const highlight = opts?.highlightPlaceholders ?? false;
  return body
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n');
      const bulletLines = lines.filter((l) => /^\s*-\s+/.test(l));
      const nonEmpty = lines.filter((l) => l.trim() !== '');
      // A block is a bullet list when every non-empty line is a "- " item.
      if (bulletLines.length > 0 && bulletLines.length === nonEmpty.length) {
        const items = bulletLines
          .map(
            (l) =>
              `<li style="margin:0 0 4px;">${applyInlineMarkup(
                l.replace(/^\s*-\s+/, ''),
                highlight,
              )}</li>`,
          )
          .join('');
        return `<ul style="margin:0 0 14px;padding-left:22px;list-style:disc;">${items}</ul>`;
      }
      const html = lines.map((l) => applyInlineMarkup(l, highlight)).join('<br>');
      return `<p style="margin:0 0 14px;">${html}</p>`;
    })
    .join('');
}

/** Today's date, formatted for a letter ("05 June 2026"). */
export function formatLetterDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Build a reference number from a template prefix, e.g. "UMF/PG/ENR/2026/4821". */
export function generateReferenceNumber(prefix?: string): string {
  const year = new Date().getFullYear();
  const serial = String(Math.floor(1000 + Math.random() * 9000));
  return `${(prefix || 'UMF/PG').replace(/\/+$/, '')}/${year}/${serial}`;
}

/** Escape text so it is safe to drop into the generated HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Build a filesystem-friendly file name (used as the saved-PDF default name). */
function fileName(data: LetterData): string {
  const slug = data.templateName.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  const id = data.matricNumber.replace(/[^a-z0-9]+/gi, '');
  return `UM_${slug}${id ? `_${id}` : ''}`;
}

/**
 * Return a complete, standalone HTML document string for the given letter.
 * Exposed (not just used internally) so it can be unit-tested or reused.
 */
export function buildLetterHtml(data: LetterData): string {
  // Same-origin absolute URL so the logo resolves inside the new window.
  const logoUrl = `${window.location.origin}${LETTERHEAD.logoPath}`;
  const title = fileName(data);

  // Render the (already-substituted) body through the shared markup formatter,
  // so the printed letter matches the on-screen preview exactly (bold / italic /
  // underline / bullet lists, paragraphs split on blank lines).
  const bodyHtml = renderLetterBodyHtml(data.bodyParagraphs);

  const addressHtml = LETTERHEAD.addressLines.map((line) => esc(line)).join('<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      color: #1e293b;
      font-size: 12px;
      line-height: 1.6;
      background: #f1f5f9;
    }
    .sheet {
      background: #ffffff;
      width: 210mm;
      margin: 0 auto;
      padding: 18mm 16mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 2.5px solid #0c1424;
      padding-bottom: 14px;
    }
    .header .brand { display: flex; align-items: center; gap: 12px; }
    .header img { height: 46px; width: auto; }
    .header .faculty {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .4px; color: #475569; max-width: 150px; line-height: 1.3;
    }
    .header .address {
      text-align: right; font-size: 8.5px; font-weight: 600;
      color: #64748b; line-height: 1.7; max-width: 230px;
    }
    .meta {
      display: flex; justify-content: space-between;
      font-family: 'Courier New', monospace; font-size: 10px;
      color: #475569; margin: 22px 0 18px;
    }
    .meta .value { color: #0f172a; font-weight: 700; }
    .recipient {
      text-align: center; font-weight: 800; text-transform: uppercase;
      letter-spacing: 1px; font-size: 13px; color: #0f172a;
      border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1;
      padding: 6px 0; margin-bottom: 20px;
    }
    p.body { margin: 0 0 16px; font-weight: 500; color: #1e293b; }
    table.details {
      width: 100%; border-collapse: collapse; margin: 0 0 18px;
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    table.details th, table.details td {
      text-align: left; padding: 9px 12px; border-bottom: 1px solid #eef2f6;
      vertical-align: middle;
    }
    table.details tr:last-child th, table.details tr:last-child td { border-bottom: 0; }
    table.details th {
      width: 34%; font-size: 9.5px; font-weight: 800; text-transform: uppercase;
      letter-spacing: .5px; color: #64748b; background: #f8fafc;
    }
    table.details td { font-size: 12px; font-weight: 700; color: #0f172a; }
    .disclaimer { font-size: 10px; color: #64748b; font-weight: 600; margin: 4px 0 0; }
    .signature {
      display: flex; justify-content: space-between; align-items: flex-end;
      border-top: 1px solid #e2e8f0; padding-top: 18px; margin-top: 56px;
      /* Keep the whole signature block together — never split it across pages. */
      break-inside: avoid; page-break-inside: avoid;
    }
    .signature .line { width: 150px; border-bottom: 1px solid #94a3b8; height: 22px; margin-bottom: 6px; }
    .signature .name { font-weight: 800; color: #0f172a; }
    .signature .office {
      font-size: 8px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 1px; color: #94a3b8; margin-top: 2px;
    }
    .signature .stamp {
      font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px;
      color: #4f46e5; border: 1px solid #c7d2fe; background: #eef2ff;
      border-radius: 8px; padding: 6px 10px; text-align: center; line-height: 1.5;
    }
    @media print {
      body { background: #ffffff; }
      .sheet { width: auto; margin: 0; padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <img src="${logoUrl}" alt="Universiti Malaya" />
        <div class="faculty">${esc(LETTERHEAD.faculty)}</div>
      </div>
      <div class="address">${addressHtml}</div>
    </div>

    <div class="meta">
      <div>Our Ref: <span class="value">${esc(data.refNo)}</span></div>
      <div>Date: <span class="value">${esc(data.date)}</span></div>
    </div>

    ${bodyHtml}

    <p class="disclaimer">${esc(LETTERHEAD.disclaimer)}</p>

    <div class="signature">
      <div>
        <div class="line"></div>
        <div class="name">${esc(LETTERHEAD.signatoryName)}</div>
        <div class="office">${esc(LETTERHEAD.signatoryOffice)}</div>
      </div>
      <div class="stamp">E-Signature<br>Encrypted &amp; Verified</div>
    </div>
  </div>

</body>
</html>`;
}

/**
 * Open the letter in a new window and trigger the print / Save-as-PDF dialog.
 * Returns `false` if the browser blocked the pop-up so the caller can prompt the
 * user to allow pop-ups for this site.
 */
export function openLetterDocument(data: LetterData): boolean {
  const win = window.open('', '_blank', 'width=900,height=1040');
  if (!win) return false;
  win.document.open();
  win.document.write(buildLetterHtml(data));
  // Register from the trusted application bundle so the generated document
  // needs no inline script under the production Content Security Policy.
  win.addEventListener(
    'load',
    () => {
      win.focus();
      win.print();
    },
    { once: true },
  );
  win.addEventListener('afterprint', () => win.close(), { once: true });
  win.document.close();
  return true;
}
