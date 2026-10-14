import type { DocumentKind, DocumentTypeOption } from '../types';
import { formatFileSize } from './documentDisplay';

const KIND_BY_EXTENSION: Record<string, DocumentKind> = {
  pdf: 'PDF',
  docx: 'DOCX',
  jpg: 'IMAGE',
  jpeg: 'IMAGE',
  png: 'IMAGE',
  xlsx: 'XLSX',
  pptx: 'PPTX',
};

const KIND_NAMES: Record<DocumentKind, string> = {
  PDF: 'PDF',
  DOCX: 'Word (.docx)',
  IMAGE: 'JPG or PNG',
  XLSX: 'Excel (.xlsx)',
  PPTX: 'PowerPoint (.pptx)',
};

const KIND_EXTENSIONS: Record<DocumentKind, string[]> = {
  PDF: ['.pdf'],
  DOCX: ['.docx'],
  IMAGE: ['.jpg', '.jpeg', '.png'],
  XLSX: ['.xlsx'],
  PPTX: ['.pptx'],
};

const STAFF_ONLY: DocumentKind[] = ['XLSX', 'PPTX'];

export function kindForName(name: string): DocumentKind | null {
  const match = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return match ? KIND_BY_EXTENSION[match[1].toLowerCase()] ?? null : null;
}

/** The kinds a type accepts for this uploader. Students never send Excel or PowerPoint. */
export function acceptedKinds(type: DocumentTypeOption | null | undefined, staff: boolean): DocumentKind[] {
  if (!type) return [];
  return type.allowedKinds.filter(kind => staff || !STAFF_ONLY.includes(kind));
}

export function kindsSentence(kinds: DocumentKind[]): string {
  const names = kinds.map(kind => KIND_NAMES[kind]);
  if (!names.length) return 'no files';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/** For the file chooser's accept attribute. */
export function acceptAttribute(kinds: DocumentKind[]): string {
  return kinds.flatMap(kind => KIND_EXTENSIONS[kind]).join(',');
}

/** The same simple checks the server makes first, so mistakes show before sending. */
export function fileProblem(
  file: Pick<File, 'name' | 'size'> | null,
  type: DocumentTypeOption | null | undefined,
  staff: boolean,
  maxBytes: number,
): string | null {
  if (!file) return 'Choose a file to upload.';
  if (file.size <= 0) return 'This file is empty.';
  if (file.size > maxBytes) return `File is ${formatFileSize(file.size)}. The maximum is ${formatFileSize(maxBytes)}.`;
  if (!type) return null;
  const kinds = acceptedKinds(type, staff);
  const kind = kindForName(file.name);
  if (!kind || !kinds.includes(kind)) return `Unsupported file type. ${type.label} accepts ${kindsSentence(kinds)}.`;
  return null;
}

export function titleFromFileName(name: string): string {
  const stem = name.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
  return stem.replace(/[_\s]+/g, ' ').trim().slice(0, 200);
}
