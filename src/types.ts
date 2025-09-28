export type UploadStatus = 'Uploading' | 'Complete' | 'Error';
export interface FileUpload {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}
// --- API Data Types ---
export interface StatementCycleData {
  name: string; // e.g., "2024-03"
  income: number;
  expenses: number;
}
export interface CreditUtilizationData {
  name: string; // Card name
  value: number; // Current balance
  limit?: number; // Optional credit limit
  fill?: string; // For chart color
}
export interface DashboardData {
  statementCycle: StatementCycleData[];
  creditUtilization: CreditUtilizationData[];
}
export interface Insight {
  id: string;
  type: string; // 'Anomaly', 'Observation', 'Suggestion'
  text: string;
}
export interface Report {
  report: string; // Markdown content
}