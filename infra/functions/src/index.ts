import { initializeApp } from "firebase-admin/app";

initializeApp();

// Tenant management
export { createTenant, createPartnerTenant, updateTenantLimits, updateTenantBranding } from "./tenants";

// User management
export { inviteUser, updateUserRole, deleteUser, requestPasswordReset } from "./users";

// Impersonation
export { impersonateUser, endImpersonation } from "./impersonate";

// Domain management
export { addDomain, removeDomain, verifyDomain } from "./domains";
