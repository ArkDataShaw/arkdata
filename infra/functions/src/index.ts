import { initializeApp } from "firebase-admin/app";

initializeApp();

// Tenant management
export { createTenant, updateTenantLimits } from "./tenants";

// User management
export { inviteUser, updateUserRole, deleteUser } from "./users";

// Impersonation
export { impersonateUser } from "./impersonate";
