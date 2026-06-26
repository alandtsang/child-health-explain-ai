import { randomUUID } from "node:crypto";

import type { AuditLog, MemoryStore } from "../../db/client.js";

type WriteAuditLogInput = {
  action: string;
  entityId: string;
  payload: unknown;
  at?: Date;
};

export function writeAuditLog(store: MemoryStore, input: WriteAuditLogInput): AuditLog {
  const auditLog = {
    id: `audit_${randomUUID()}`,
    action: input.action,
    entityId: input.entityId,
    payload: input.payload,
    createdAt: (input.at ?? new Date()).toISOString()
  };

  store.auditLogs.push(auditLog);

  return auditLog;
}
