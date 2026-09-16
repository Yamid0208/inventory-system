export interface ReportMetadata {
  key: string;
  title: string;
  description: string;
  icon: string;
  recordCount: number;
  lastUpdated: string;
}

export interface ReportsCatalogSummary {
  reports: ReportMetadata[];
  totalExportableRecords: number;
}

export type ReportSummary = ReportsCatalogSummary;
