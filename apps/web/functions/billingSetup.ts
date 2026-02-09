import { base44 } from "@/api/base44Client";

/**
 * Setup default billing plan with Stripe payment link
 */
export async function setupDefaultBillingPlan() {
  try {
    // Check if plan already exists
    const existing = await base44.entities.BillingPlan.list("created_date", 1);
    if (existing?.length > 0) {
      console.log("Billing plan already exists");
      return existing[0];
    }

    // Create default plan with payment link
    const plan = await base44.entities.BillingPlan.create({
      plan_key: "recaptured_usage",
      name: "Usage-Based Billing (Enhanced Leads)",
      description: "Pay per Enhanced Lead (identified visitor)",
      stripe_price_id_metered: "price_1QscNGEU5qXrVMVXxjCw3v8h",
      stripe_price_id_base: null,
      payment_link_url: "https://buy.stripe.com/00w3cuabxcak85Uaa18EM01",
      unit_name: "Enhanced Lead",
      unit_price_cents_display: 30, // $0.30 per lead (display price)
      discount_percent_default: 30,
      discount_duration_months_default: 3,
      trial_days_default: 30,
      active: true,
    });

    console.log("Billing plan created:", plan.id);
    return plan;
  } catch (error) {
    console.error("Billing setup error:", error.message);
    throw error;
  }
}

export async function getDefaultBillingPlan() {
  try {
    const plans = await base44.entities.BillingPlan.list("created_date", 1);
    return plans?.[0] || null;
  } catch (error) {
    console.error("Error fetching billing plan:", error.message);
    return null;
  }
}

export async function getPaymentLinkUrl() {
  try {
    const plan = await getDefaultBillingPlan();
    return plan?.payment_link_url || null;
  } catch (error) {
    console.error("Error getting payment link:", error.message);
    return null;
  }
}