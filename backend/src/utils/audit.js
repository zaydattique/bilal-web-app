import AuditLog from '../models/AuditLog.js';

export const logAction = async ({
  businessId,
  adminId,
  action,
  entityType,
  entityId,
  changes,
  ipAddress,
  userAgent,
}) => {
  try {
    await AuditLog.create({
      businessId,
      adminId,
      action,
      entityType,
      entityId,
      changes,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};
