/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminBillingSettings from './pages/AdminBillingSettings';
import AdminDataHygiene from './pages/AdminDataHygiene';
import AdminFeatureFlags from './pages/AdminFeatureFlags';
import AdminFeedback from './pages/AdminFeedback';
import AdminHealthDashboard from './pages/AdminHealthDashboard';
import AdminHelpCMS from './pages/AdminHelpCMS';
import AdminIntegrations from './pages/AdminIntegrations';
import AdminJobs from './pages/AdminJobs';
import AdminLogs from './pages/AdminLogs';
import AdminOnboardingAnalytics from './pages/AdminOnboardingAnalytics';
import AdminOnboardingBuilder from './pages/AdminOnboardingBuilder';
import AdminOnboardingSupport from './pages/AdminOnboardingSupport';
import AdminPipeline from './pages/AdminPipeline';
import AdminSecurity from './pages/AdminSecurity';
import AdminTenantDetail from './pages/AdminTenantDetail';
import AdminTenants from './pages/AdminTenants';
import AdminUIBuilder from './pages/AdminUIBuilder';
import AdminUIConfig from './pages/AdminUIConfig';
import AdminUserDetail from './pages/AdminUserDetail';
import AdminUsers from './pages/AdminUsers';
import AdminWorkflows from './pages/AdminWorkflows';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import AppSettings from './pages/AppSettings';
import Automations from './pages/Automations';
import Billing from './pages/Billing';
import Companies from './pages/Companies';
import DashboardBuilder from './pages/DashboardBuilder';
import Dashboards from './pages/Dashboards';
import DataHygiene from './pages/DataHygiene';
import FunnelBuilder from './pages/FunnelBuilder';
import Home from './pages/Home';
import Integrations from './pages/Integrations';
import LostTraffic from './pages/LostTraffic';
import MobileDashboard from './pages/MobileDashboard';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import SegmentBuilder from './pages/SegmentBuilder';
import Sessions from './pages/Sessions';
import Settings from './pages/Settings';
import TeamMembers from './pages/TeamMembers';
import VisitorDetail from './pages/VisitorDetail';
import Visitors from './pages/Visitors';
import Analytics from './pages/Analytics';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminBillingSettings": AdminBillingSettings,
    "AdminDataHygiene": AdminDataHygiene,
    "AdminFeatureFlags": AdminFeatureFlags,
    "AdminFeedback": AdminFeedback,
    "AdminHealthDashboard": AdminHealthDashboard,
    "AdminHelpCMS": AdminHelpCMS,
    "AdminIntegrations": AdminIntegrations,
    "AdminJobs": AdminJobs,
    "AdminLogs": AdminLogs,
    "AdminOnboardingAnalytics": AdminOnboardingAnalytics,
    "AdminOnboardingBuilder": AdminOnboardingBuilder,
    "AdminOnboardingSupport": AdminOnboardingSupport,
    "AdminPipeline": AdminPipeline,
    "AdminSecurity": AdminSecurity,
    "AdminTenantDetail": AdminTenantDetail,
    "AdminTenants": AdminTenants,
    "AdminUIBuilder": AdminUIBuilder,
    "AdminUIConfig": AdminUIConfig,
    "AdminUserDetail": AdminUserDetail,
    "AdminUsers": AdminUsers,
    "AdminWorkflows": AdminWorkflows,
    "AdvancedAnalytics": AdvancedAnalytics,
    "AppSettings": AppSettings,
    "Automations": Automations,
    "Billing": Billing,
    "Companies": Companies,
    "DashboardBuilder": DashboardBuilder,
    "Dashboards": Dashboards,
    "DataHygiene": DataHygiene,
    "FunnelBuilder": FunnelBuilder,
    "Home": Home,
    "Integrations": Integrations,
    "LostTraffic": LostTraffic,
    "MobileDashboard": MobileDashboard,
    "Onboarding": Onboarding,
    "Profile": Profile,
    "Reports": Reports,
    "SegmentBuilder": SegmentBuilder,
    "Sessions": Sessions,
    "Settings": Settings,
    "TeamMembers": TeamMembers,
    "VisitorDetail": VisitorDetail,
    "Visitors": Visitors,
    "Analytics": Analytics,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};