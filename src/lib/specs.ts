import type { Layer, SpecKey } from './types'

export interface SpecMeta {
  key: SpecKey
  name: string
  /** One-line description of what the standard is for. */
  tagline: string
  /** Governing body / publisher. */
  publisher: string
  /** Accent color used across the matrix, cards, and charts. */
  color: string
  /** Which of the three buckets the spec meaningfully has content for. */
  layers: Layer[]
  /** Serialization formats observed for the spec in the graph. */
  formats: string[]
}

/**
 * 16 in-scope standards (use cases + EdMatrix excluded by request).
 * Layer coverage and formats are grounded in the EDUcore graph
 * (AT_LAYER / USES_FORMAT) and each spec's own model nodes.
 */
export const SPECS: SpecMeta[] = [
  {
    key: 'CEDS',
    name: 'CEDS',
    tagline: 'Common Education Data Standards — the U.S. national education data dictionary & vocabulary.',
    publisher: 'U.S. Department of Education',
    color: '#3b82f6',
    layers: ['data-model'],
    formats: ['RDF', 'JSON-LD'],
  },
  {
    key: 'SIF',
    name: 'SIF',
    tagline: 'Schools Interoperability Framework — K-12 data objects plus an exchange infrastructure.',
    publisher: 'Access 4 Learning (A4L) Community',
    color: '#06b6d4',
    layers: ['data-model', 'transport', 'api'],
    formats: ['XML', 'JSON', 'HTTP'],
  },
  {
    key: 'Ed-Fi',
    name: 'Ed-Fi',
    tagline: 'Operational K-12 data model with a REST API for real-time interoperability.',
    publisher: 'Ed-Fi Alliance',
    color: '#2563eb',
    layers: ['data-model', 'transport', 'api'],
    formats: ['JSON'],
  },
  {
    key: 'PESC',
    name: 'PESC',
    tagline: 'Postsecondary Electronic Standards Council — XML standards for transcripts & admissions.',
    publisher: 'PESC',
    color: '#7c3aed',
    layers: ['data-model', 'transport'],
    formats: ['XML'],
  },
  {
    key: 'CTDL',
    name: 'CTDL',
    tagline: 'Credential Transparency Description Language — linked-data vocabulary for the credentialing ecosystem.',
    publisher: 'Credential Engine',
    color: '#9333ea',
    layers: ['data-model', 'transport'],
    formats: ['JSON-LD', 'RDF'],
  },
  {
    key: 'CLR',
    name: 'CLR',
    tagline: 'Comprehensive Learner Record — verifiable, machine-readable record of achievements.',
    publisher: '1EdTech',
    color: '#db2777',
    layers: ['data-model', 'transport', 'api'],
    formats: ['JSON', 'JSON-LD'],
  },
  {
    key: 'OpenBadges',
    name: 'Open Badges',
    tagline: 'Open Badges 3.0 — verifiable digital credentials as W3C Verifiable Credentials.',
    publisher: '1EdTech',
    color: '#e11d48',
    layers: ['data-model', 'transport', 'api'],
    formats: ['JSON-LD', 'W3C VC'],
  },
  {
    key: 'Ed-API',
    name: 'Ed-API',
    tagline: '1EdTech Education API — a REST surface unifying access to education data.',
    publisher: '1EdTech',
    color: '#f59e0b',
    layers: ['data-model', 'transport', 'api'],
    formats: ['REST', 'JSON'],
  },
  {
    key: 'CASE',
    name: 'CASE',
    tagline: 'Competencies & Academic Standards Exchange — machine-readable academic standards.',
    publisher: '1EdTech',
    color: '#10b981',
    layers: ['data-model', 'transport', 'api'],
    formats: ['JSON-LD'],
  },
  {
    key: 'LIF',
    name: 'LIF',
    tagline: 'Learner Information Framework — JSON model + OpenAPI for portable learner data.',
    publisher: 'A4L / LIF',
    color: '#14b8a6',
    layers: ['data-model', 'transport', 'api'],
    formats: ['JSON', 'OpenAPI'],
  },
  {
    key: 'JEDx',
    name: 'JEDx',
    tagline: 'Jobs & Employment Data Exchange — connecting education and workforce records.',
    publisher: 'U.S. Chamber of Commerce Foundation',
    color: '#84cc16',
    layers: ['data-model', 'transport'],
    formats: ['JSON'],
  },
  {
    key: 'SOC',
    name: 'SOC',
    tagline: 'Standard Occupational Classification — federal taxonomy of occupations.',
    publisher: 'U.S. Bureau of Labor Statistics',
    color: '#65a30d',
    layers: ['data-model'],
    formats: ['CSV'],
  },
  {
    key: 'CIP',
    name: 'CIP',
    tagline: 'Classification of Instructional Programs — taxonomy of academic programs of study.',
    publisher: 'U.S. NCES',
    color: '#ca8a04',
    layers: ['data-model'],
    formats: ['CSV'],
  },
  {
    key: 'SEDM',
    name: 'SEDM',
    tagline: 'Special Education Data Model — IDEA-aligned model for special education reporting.',
    publisher: 'CEDS / IDEA community',
    color: '#0891b2',
    layers: ['data-model', 'transport'],
    formats: ['CSV'],
  },
  {
    key: 'DCTAP',
    name: 'DCTAP',
    tagline: 'Dublin Core Tabular Application Profile — a tabular way to describe data shapes.',
    publisher: 'Dublin Core (DCMI)',
    color: '#4f46e5',
    layers: ['data-model', 'transport'],
    formats: ['CSV'],
  },
  {
    key: 'MedBiquitous',
    name: 'MedBiquitous',
    tagline: 'Health-professions education & credentialing standards (XML schemas + SOAP web services).',
    publisher: 'MedBiquitous / IEEE',
    color: '#dc2626',
    layers: ['data-model', 'transport', 'api'],
    formats: ['XML', 'SOAP'],
  },
]

export const SPEC_MAP: Record<SpecKey, SpecMeta> = Object.fromEntries(
  SPECS.map((s) => [s.key, s]),
) as Record<SpecKey, SpecMeta>
