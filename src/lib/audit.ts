import { supabaseServer } from '@/lib/supabaseServer';

export interface AuditParams {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: any;
  after?: any;
  ip?: string | null;
}

export async function logAudit(params: AuditParams) {
  try {
    await supabaseServer.from('AuditLog').insert({
      userId: params.userId || null,
      userName: params.userName || null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId || null,
      before: params.before ? JSON.stringify(params.before) : null,
      after: params.after ? JSON.stringify(params.after) : null,
      ip: params.ip || null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error registrando auditoria en AuditLog:', err);
  }
}
