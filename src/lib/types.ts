// Core domain types for the EDUcore Mastery quiz app.

/** The three knowledge buckets the user asked questions to be separated into. */
export type Layer = 'data-model' | 'transport' | 'api'

/** Canonical spec keys (use cases + EdMatrix excluded by request). */
export type SpecKey =
  | 'CEDS'
  | 'SIF'
  | 'Ed-Fi'
  | 'PESC'
  | 'CTDL'
  | 'CLR'
  | 'OpenBadges'
  | 'Ed-API'
  | 'CASE'
  | 'LIF'
  | 'JEDx'
  | 'SOC'
  | 'CIP'
  | 'SEDM'
  | 'DCTAP'
  | 'MedBiquitous'
  | 'SkillsProf'

export type Difficulty = 'intro' | 'core' | 'advanced'

export interface Question {
  id: string
  spec: SpecKey
  layer: Layer
  difficulty: Difficulty
  /** Short topic tag, e.g. "Option Sets", "Entities", "Serialization". */
  concept: string
  question: string
  /** Exactly four answer choices. */
  options: [string, string, string, string]
  /** Index (0-3) of the correct option. */
  answerIndex: number
  /** Why the answer is correct — surfaced in the study narrative for missed questions. */
  explanation: string
  /** Graph node name(s) this question is grounded in. */
  source: string
}

export const LAYERS: Layer[] = ['data-model', 'transport', 'api']

export const LAYER_META: Record<Layer, { label: string; short: string; blurb: string; icon: string }> = {
  'data-model': {
    label: 'Data Model',
    short: 'Model',
    blurb: 'Entities, properties, fields, types, and code sets — the dictionary and logical structure of the spec.',
    icon: '🧬',
  },
  transport: {
    label: 'Transport',
    short: 'Transport',
    blurb: 'How instances are serialized and moved — XML, JSON / JSON-LD, RDF, CSV, and protocol bindings.',
    icon: '📦',
  },
  api: {
    label: 'API',
    short: 'API',
    blurb: 'Operational surface — REST resources, SOAP/WSDL operations, endpoints, and request/response shapes.',
    icon: '🔌',
  },
}
