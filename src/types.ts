export type View = 'dashboard' | 'batches' | 'audit' | 'history' | 'costs' | 'settings';

export interface Batch {
  id: string;
  name: string;
  date: string;
  totalStudents: number;
  processedStudents: number;
  status: 'completed' | 'processing' | 'error';
}

export interface AuditItem {
  id: string;
  studentName: string;
  course: string;
  errorReason: string;
  aiConfidence: number;
  documentUrl: string;
  data: {
    name: string;
    cpf: string;
    rg: string;
    birthDate: string;
    graduationDate: string;
  };
}

export interface HistoryEntry {
  id: string;
  studentName: string;
  cpf: string;
  course: string;
  status: string;
  timeline: {
    time: string;
    event: string;
    details: string;
  }[];
}
