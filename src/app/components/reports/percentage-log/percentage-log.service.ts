import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Entity, PercentageLog, PercentageLogFilter, EntityType } from './percentage-log.types';

@Injectable({ providedIn: 'root' })
export class PercentageLogService {
  private mockEntities: Entity[] = [
    { id: 'admin-1', name: 'Platform Admin', type: EntityType.ADMIN },
    { id: 'sub-1', name: 'SubAdmin A', type: EntityType.SUB_ADMIN, parentId: 'admin-1' },
    { id: 'sub-2', name: 'SubAdmin B', type: EntityType.SUB_ADMIN, parentId: 'admin-1' },
    { id: 'master-1', name: 'Master A1', type: EntityType.MASTER, parentId: 'sub-1' },
    { id: 'master-2', name: 'Master B1', type: EntityType.MASTER, parentId: 'sub-2' },
    { id: 'agent-1', name: 'Agent A1-1', type: EntityType.AGENT, parentId: 'master-1' },
    { id: 'user-1', name: 'User A1-1-1', type: EntityType.USER, parentId: 'agent-1' }
  ];

  private mockLogs: PercentageLog[] = [
    { id: 'b3aba4ae', createdAt: '2025-12-02T16:04:29.151Z', websiteId: '3930...e909', dw: 55, wp: 60, entityId: 'sub-1', entityType: EntityType.SUB_ADMIN },
    { id: 'cc306685', createdAt: '2025-12-02T16:14:10.619Z', websiteId: '3930...e909', dw: 34, wp: 34, entityId: 'sub-2', entityType: EntityType.SUB_ADMIN },
    { id: 'rec-1', createdAt: '2025-12-01T10:00:00Z', websiteId: 'site-1', dw: 45, wp: 56, entityId: 'sub-1', entityType: EntityType.SUB_ADMIN },
    { id: 'rec-2', createdAt: '2025-12-02T11:00:00Z', websiteId: 'site-1', dw: 47, wp: 53, entityId: 'sub-1', entityType: EntityType.SUB_ADMIN },
    { id: 'rec-3', createdAt: '2025-12-02T09:00:00Z', websiteId: 'site-2', dw: 50, wp: 50, entityId: 'master-1', entityType: EntityType.MASTER },
    { id: 'rec-4', createdAt: '2025-12-02T14:00:00Z', websiteId: 'site-3', dw: 60, wp: 65, entityId: 'master-1', entityType: EntityType.MASTER },
    { id: 'rec-5', createdAt: '2025-12-02T12:00:00Z', websiteId: 'site-4', dw: 40, wp: 45, entityId: 'agent-1', entityType: EntityType.AGENT }
  ];

  getEntities(type: EntityType): Observable<Entity[]> {
    const filtered = this.mockEntities.filter(e => e.type === type);
    return of(filtered).pipe(delay(300));
  }

  getPercentageLogs(filter: PercentageLogFilter): Observable<PercentageLog[]> {
    let filtered = this.mockLogs.filter(log => {
      const logDate = new Date(log.createdAt);
      const from = new Date(filter.fromDate);
      const to = new Date(filter.toDate);

      return logDate >= from && logDate <= to;
    });

    if (filter.viewScope === 'SINGLE' && filter.entityId) {
      if (filter.reportType === 'DEPENDENT') {
        const descendants = this.getAllDescendants(filter.entityId);
        const entityIds = [filter.entityId, ...descendants.map(d => d.id)];
        filtered = filtered.filter(log => entityIds.includes(log.entityId));
      } else {
        filtered = filtered.filter(log => log.entityId === filter.entityId);
      }
    } else if (filter.viewScope === 'WHOLE') {
      filtered = filtered.filter(log => log.entityType === filter.entityType);
    }

    return of(filtered).pipe(delay(500));
  }

  getChildrenLogs(parentEntityId: string): Observable<PercentageLog[]> {
    const children = this.mockEntities.filter(e => e.parentId === parentEntityId);
    const childIds = children.map(c => c.id);
    const childLogs = this.mockLogs.filter(log => childIds.includes(log.entityId));
    return of(childLogs).pipe(delay(300));
  }

  getEntityById(entityId: string): Entity | undefined {
    return this.mockEntities.find(e => e.id === entityId);
  }

  private getAllDescendants(entityId: string): Entity[] {
    const descendants: Entity[] = [];
    const children = this.mockEntities.filter(e => e.parentId === entityId);

    children.forEach(child => {
      descendants.push(child);
      descendants.push(...this.getAllDescendants(child.id));
    });

    return descendants;
  }
}
