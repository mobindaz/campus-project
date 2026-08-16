import { prisma } from "@/server/database";

export interface LogAuditParams {
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, any>;
}

/**
 * Platform Engine: Audit Logger
 * Logs system mutations to the audit_logs table for administrative compliance and history tracking.
 */
export async function logAudit(params: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userEmail: params.userEmail,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details ? (params.details as any) : undefined,
      },
    });
  } catch (error) {
    // Audit logging failure should not crash core operation, log error gracefully
    console.error("Failed to record audit log:", error);
    return null;
  }
}
