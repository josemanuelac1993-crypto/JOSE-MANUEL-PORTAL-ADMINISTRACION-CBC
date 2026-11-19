export type Branch = 
  | 'Ag. Gye Norte'
  | 'Ag. Gye Sur'
  | 'Tesalia Planta Gye'
  | 'Planta Milagro'
  | 'Ag. Manta'
  | 'Planta Machala';

export const BRANCHES: Branch[] = [
  'Ag. Gye Norte',
  'Ag. Gye Sur',
  'Tesalia Planta Gye',
  'Planta Milagro',
  'Ag. Manta',
  'Planta Machala'
];

export type MainSection = 'SEGURIDAD_FISICA' | 'SSOMA';

export type SubSectionSecurity = 'SECURITY' | 'KPI_MEJORA_SERVICIO' | 'GESTION_INTERNA';
export type SubSectionSSOMA = 'SAFETY' | 'SMA' | 'SSO';
export type SubSection = SubSectionSecurity | SubSectionSSOMA;

export type Severity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA';
export type IncidentStatus = 'ABIERTO' | 'EN_GESTION' | 'REPORTADO_LEGIO' | 'RESUELTO';

export interface Operator {
  id: string;
  name: string;
  code: string;
  role: string;
  shift: string;
  branch: Branch;
  avatar?: string;
}

export interface FollowUpNote {
  id: string;
  date: string;
  author: string;
  note: string;
  statusChange?: IncidentStatus;
}

export interface Incident {
  id: string;
  code: string;
  mainSection: MainSection;
  subSection: SubSection;
  classificationType: string;
  item: string;
  branch: Branch;
  specificLocation: string;
  title: string;
  description: string;
  timestamp: string;
  month: string;
  year: number;
  operator: {
    name: string;
    code: string;
    role: string;
    shift: string;
  };
  severity: Severity;
  status: IncidentStatus;
  actionsTaken: string;
  reportedToLegio: boolean;
  legioTicketNumber?: string;
  cctvCaseResolved?: boolean;
  evidenceImages?: string[];
  sourceDocument?: {
    name: string;
    type: 'PDF' | 'EXCEL' | 'IMAGEN' | 'MANUAL';
    analyzedByAI: boolean;
  };
  followUps?: FollowUpNote[];
}

export interface CategoryDefinition {
  mainSection: MainSection;
  subSection: SubSection;
  subSectionLabel: string;
  classificationType: string;
  items: string[];
  description?: string;
}

export const TAXONOMY: CategoryDefinition[] = [
  // SEGURIDAD FÍSICA - SECURITY - ACTOS
  {
    mainSection: 'SEGURIDAD_FISICA',
    subSection: 'SECURITY',
    subSectionLabel: 'Incidentes de Security',
    classificationType: 'Actos Subestándares',
    items: [
      'ROBOS, PÉRDIDAS / SUSTRACCIONES / DECOMISOS DEVOLUCIONES',
      'PRENDAS PRODUCTOS Y EQUIPOS ABANDONADOS',
      'VEHICULOS / PERSONAS SOSPECHOSAS',
      'AUTORIZACIÓN DE SALIDA DE MATERIAL EN FORMA VERBAL',
      'SINTOMAS DE EMBRIAGUEZ, ESTADO ETÍLICO',
      'ERROR DE DOCUMENTO, MAL DESPACHO',
      'PUERTAS Y VENTANAS ABIERTAS O SIN SEGURO',
      'VEHICULOS ABIERTOS O SIN SEGURO',
      'OTROS 1'
    ]
  },
  // SEGURIDAD FÍSICA - SECURITY - CONDICIONES
  {
    mainSection: 'SEGURIDAD_FISICA',
    subSection: 'SECURITY',
    subSectionLabel: 'Incidentes de Security',
    classificationType: 'Condiciones Subestándares',
    items: [
      'FALLA DE PUERTAS Y VENTANAS (CHAPAS, OTROS)',
      'FALLA DE COMUNICACIÓN',
      'FALLA DE ILUMINACIÓN (INTERNA Y EXTERNA)',
      'FALLA DE ALARMAS (CERCO ELÉCTRICO, SENSORES, OTROS)',
      'FALLA DE CCTV (CAMARA, MONITOR, GRABACIÓN)',
      'FALLA DE PESAJE, BALANZA',
      'OTROS 2'
    ]
  },
  // SEGURIDAD FÍSICA - KPI MEJORA DE SERVICIO
  {
    mainSection: 'SEGURIDAD_FISICA',
    subSection: 'KPI_MEJORA_SERVICIO',
    subSectionLabel: 'KPI Mejora de Servicio',
    classificationType: 'KPI Mejora de Servicio',
    items: [
      'CASOS RESUELTOS POR CCTV',
      'INFORMES ENVIADOS',
      'SUPERVISION SISTEMA CCTV',
      'FALLAS DE REVISIÓN POR PUNTOS CIEGOS',
      'REPORTES DE FALLAS A LEGIO',
      'BRIEFING DE SEGURIDAD',
      'CAPACITACIONES',
      'INCUMPLIMIENTO DE FUNCIONES'
    ]
  },
  // SEGURIDAD FÍSICA - GESTIÓN INTERNA
  {
    mainSection: 'SEGURIDAD_FISICA',
    subSection: 'GESTION_INTERNA',
    subSectionLabel: 'Gestión Interna',
    classificationType: 'Gestión Interna',
    items: [
      'REUBICACIÓN DE CAMARAS',
      'MEJORAS DE ENFOQUE CCTV',
      'FEEDBACK A CONSOLA',
      'REEMPLAZO DE CAMARAS',
      'ACTOS SUBESTANDAR',
      'CONDICIONES SUBESTANDAR',
      'MEJORA DE PROCESOS',
      'SEGUIMIENTOS DE CASOS CCTV',
      'VISITA A PUESTOS',
      'OPORTUNIDADES DE MEJORA',
      'FEEDBACK LIDERMAN'
    ]
  },
  // SSOMA - SAFETY
  {
    mainSection: 'SSOMA',
    subSection: 'SAFETY',
    subSectionLabel: 'Incidentes de Safety',
    classificationType: 'Condiciones Subestándares',
    items: [
      'ESTIBAS MAL UBICADAS O MAL REALIZADAS',
      'BLOQUEO DE EQUIPOS DE CONTRA INCENDIO',
      'FALTA DE EXTINTORES O FECHAS VENCIDAS',
      'FALTA DE SEÑALIZACIÓN O INADECUADA',
      'BLOQUEO DE PUERTAS DE EMERGENCIA',
      'DERRIVES O DESBORDES DE PRODUCTO',
      'CABLES EXPUESTOS',
      'PISOS MOJADOS / RESBALOSOS',
      'EQUIPOS DEFECTUOSOS / INSTALACIÓN DEFECTUOSA',
      'CONATO / INCENDIO',
      'DAÑOS MATERIALES (CAIDA O DAÑOS DE ACTIVOS DEL CLIENTE)',
      'CORTE DE FLUIDO ELÉCTRICO INT./ EXT.',
      'TRABAJOS DE ALTO RIESGO SIN PERMISO',
      'OTROS CONDICIONES / SAFETY'
    ]
  },
  // SSOMA - SMA
  {
    mainSection: 'SSOMA',
    subSection: 'SMA',
    subSectionLabel: 'Incidentes de SMA (Medio Ambiente)',
    classificationType: 'Actos de Sistema Medio Ambiental',
    items: [
      'DERRAME DE COMBUSTIBLE / QUÍMICOS',
      'LUCES ENCENDIDAS',
      'EQUIPOS Y MAQUINARIAS ENCENDIDAS',
      'DESECHOS INORGÁNICOS (PAPEL, MADERA, PLASTICO, OTROS RECICLADOS)',
      'ANIEGOS E INUNDACIONES',
      'PLAGAS: ROEDORES / AVES / INSECTOS Y OTROS',
      'FUGAS / DERRAMES / EMANACIONES',
      'OTROS AMBIENTALES (SMA)'
    ]
  },
  // SSOMA - SSO
  {
    mainSection: 'SSOMA',
    subSection: 'SSO',
    subSectionLabel: 'Incidentes de SSO (Salud Ocupacional)',
    classificationType: 'Actos de Seguridad y Salud Ocupacional',
    items: [
      'NO USO DE EPP',
      'MANIOBRAS PELIGROSAS',
      'RIESGOS OCUPACIONALES (HERIDAS, FRACTURAS, OTROS)',
      'ENFERMEDADES OCUPACIONALES (ERGONOMIA, INHALACIÓN, OTROS)',
      'USO DE BOTIQUINES / PRIMEROS AUXILIOS',
      'OTROS SALUD OCUPACIONAL (SSO)'
    ]
  }
];

export const OPERATOR_PROFILES: Operator[] = [
  {
    id: 'usr-admin',
    name: 'José Manuel Arguello Coloma',
    code: 'COORD-01',
    role: 'Administrador / Coordinador de Proyecto Liderman',
    shift: 'General Administrativo',
    branch: 'Tesalia Planta Gye'
  },
  {
    id: 'usr-opr-1',
    name: 'Carlos Morán Viteri',
    code: 'OPR-04',
    role: 'Operador de Consola Central CCTV',
    shift: 'Turno A (06:00 - 14:00)',
    branch: 'Tesalia Planta Gye'
  },
  {
    id: 'usr-opr-2',
    name: 'Diana Mendoza Saltos',
    code: 'OPR-02',
    role: 'Operador de Consola CCTV',
    shift: 'Turno B (14:00 - 22:00)',
    branch: 'Ag. Gye Sur'
  },
  {
    id: 'usr-opr-3',
    name: 'Kevin Morán Rosales',
    code: 'OPR-05',
    role: 'Operador de Consola Monitoreo',
    shift: 'Turno C (22:00 - 06:00)',
    branch: 'Planta Milagro'
  },
  {
    id: 'usr-opr-4',
    name: 'Edison Zambrano Loor',
    code: 'OPR-07',
    role: 'Operador de Consola CCTV',
    shift: 'Turno A (06:00 - 14:00)',
    branch: 'Ag. Manta'
  },
  {
    id: 'usr-opr-5',
    name: 'Mariuxi Peña Herrera',
    code: 'OPR-09',
    role: 'Operador de Consola CCTV',
    shift: 'Turno B (14:00 - 22:00)',
    branch: 'Planta Machala'
  }
];

export const MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

export interface DocumentFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  createdAt: string;
  isSystem?: boolean;
}

export interface StoredDocument {
  id: string;
  name: string;
  originalName: string;
  folderId: string;
  folderName: string;
  size: number;
  mimeType: string;
  fileExtension: string;
  uploadedAt: string;
  uploadedBy: {
    name: string;
    role: string;
  };
  branch?: string;
  description?: string;
  tags?: string[];
  dataUrl?: string; // For small files or inline preview
  assignedIncidentId?: string;
  assignedIncidentTitle?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  quickPrompts?: string[];
  executedActions?: {
    type: string;
    summary: string;
    incident?: any;
    document?: any;
    payload?: any;
  }[];
}

