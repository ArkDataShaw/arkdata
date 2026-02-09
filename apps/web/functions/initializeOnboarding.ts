import { base44 } from "@/api/base44Client";
import { initializeDefaultFlow } from "./onboardingFlow";

/**
 * Run on app startup to initialize default onboarding flow
 * This should be called once during app initialization
 */
export async function ensureDefaultOnboardingFlowExists() {
  try {
    // Check if default flow already exists
    const existing = await base44.entities.OnboardingFlow.filter({
      scope: "global",
      name: "Ark Data Setup (Default)",
      status: "published",
    });

    if (existing.length > 0) {
      console.log("Default onboarding flow already initialized");
      return existing[0];
    }

    // Initialize default flow
    const flow = await initializeDefaultFlow();
    console.log("Default onboarding flow initialized:", flow.id);
    return flow;
  } catch (error) {
    console.error("Failed to initialize default onboarding flow:", error);
    throw error;
  }
}

/**
 * Seed demo tenant with onboarding state
 */
export async function seedOnboardingDemo(tenantId, userId) {
  try {
    const flows = await base44.entities.OnboardingFlow.filter({
      scope: "global",
      status: "published",
    });

    if (flows.length === 0) {
      console.log("No published flows available for demo seeding");
      return;
    }

    const flow = flows[0];

    // Create user state
    await base44.entities.OnboardingUserState.create({
      tenant_id: tenantId,
      user_id: userId,
      flow_id: flow.id,
      started_at: new Date().toISOString(),
    });

    // Create workspace state
    await base44.entities.OnboardingWorkspaceState.create({
      tenant_id: tenantId,
      flow_id: flow.id,
      started_at: new Date().toISOString(),
    });

    // Mark first 5 tasks as complete (Setup category)
    const flowConfig = flow.config_json;
    const setupTasks = flowConfig.categories[0].tasks.slice(0, 5);

    for (const task of setupTasks) {
      await base44.entities.OnboardingTaskStatus.create({
        tenant_id: tenantId,
        flow_id: flow.id,
        task_id: task.id,
        scope: "workspace",
        status: "complete",
        completed_at: new Date(
          Date.now() - Math.random() * 24 * 60 * 60 * 1000
        ).toISOString(),
        completion_source: "auto",
      });
    }

    console.log("Demo onboarding state seeded for tenant:", tenantId);
  } catch (error) {
    console.error("Failed to seed onboarding demo:", error);
  }
}