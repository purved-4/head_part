export enum EntityType {
  ADMIN = 'ADMIN',
  SUB_ADMIN = 'SUB_ADMIN',
  MASTER = 'MASTER',
  AGENT = 'AGENT',
  USER = 'USER'
}

export enum ViewScope {
  SINGLE = 'SINGLE',
  WHOLE = 'WHOLE'
}

export enum ReportType {
  SELF = 'SELF',
  DEPENDENT = 'DEPENDENT'
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  parentId?: string;
}

export interface PercentageLog {
  id: string;
  createdAt: string;
  websiteId: string;
  dw: number;
  wp: number;
  entityId: string;
  entityType: EntityType;
}

export interface PercentageLogFilter {
  entityType: EntityType;
  fromDate: string;
  toDate: string;
  entityId?: string;
  reportType: ReportType;
  viewScope: ViewScope;
}

export interface GroupedLogs {
  entity: Entity;
  logs: PercentageLog[];
  summary: {
    count: number;
    avgDw: number;
    avgWp: number;
    minDw: number;
    minWp: number;
    maxDw: number;
    maxWp: number;
  };
  children?: PercentageLog[];
  expanded: boolean;
  childExpanded: { [key: string]: boolean };
}
