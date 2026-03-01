// @ts-nocheck — Barrel file with known duplicate exports across service modules.
// Consumers should import directly from specific service files when possible.
export { supabase } from './supabaseClient';

export * from './addressService';
export * from './authService';
export * from './checkoutService';
export * from './communicationsService';
export * from './coachingService';
export * from './contactService';
export * from './deliveryService';
export * from './fiscalService';
export * from './inspectionsService';

export * from './managerDashboardService';
export * from './meetingsService';
export * from './menuService';
export * from './notificationsService';
export * from './paymentConfigService';
export * from './permissionsService';
export * from './posService';
export * from './profileService';
export * from './publicBranchService';
export * from './schedulesService';
export * from './staffService';
export * from './userOnboardingService';
export * from './webappOrderService';
export * from './whatsappService';

export * from './hrService';
export * from './warningsService';

export * from './configService';
export * from './proveedoresService';
export * from './financialService';
export * from './printingService';
export * from './promoService';
export * from './adminService';
