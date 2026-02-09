import { base44 } from "@/api/base44Client";

/**
 * Handles Stripe webhooks for subscription & billing events
 * Call this from your serverless backend endpoint: POST /api/billing/webhook
 */
export async function handleStripeWebhook(event, stripeSigningSecret) {
  try {
    // Verify webhook signature (use stripe.webhooks.constructEvent in Node)
    // For this example, assume signature is already verified

    const { type, data } = event;

    switch (type) {
      case "checkout.session.completed":
        return handleCheckoutCompleted(data.object);

      case "customer.subscription.created":
        return handleSubscriptionCreated(data.object);

      case "customer.subscription.updated":
        return handleSubscriptionUpdated(data.object);

      case "customer.subscription.deleted":
        return handleSubscriptionDeleted(data.object);

      case "invoice.paid":
        return handleInvoicePaid(data.object);

      case "invoice.payment_failed":
        return handleInvoicePaymentFailed(data.object);

      default:
        console.log("Unhandled webhook type:", type);
        return { status: "ignored" };
    }
  } catch (error) {
    console.error("Webhook handling error:", error);
    throw error;
  }
}

async function handleCheckoutCompleted(session) {
  try {
    const tenantId = session.client_reference_id;
    if (!tenantId) {
      console.warn("No tenant ID in checkout session");
      return;
    }

    // Store billing event
    await base44.entities.BillingEvent.create({
      tenant_id: tenantId,
      event_type: "checkout_completed",
      payload_json: {
        stripe_session_id: session.id,
        stripe_customer_id: session.customer,
      },
    });

    return { status: "checkout_completed", tenant_id: tenantId };
  } catch (error) {
    console.error("Checkout completion error:", error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    const stripeCustomerId = subscription.customer;
    const tenantId = subscription.metadata?.tenant_id;

    if (!tenantId) {
      console.warn("No tenant ID in subscription metadata");
      return;
    }

    // Find metered price item
    const meteredItem = subscription.items.data.find((item) =>
      item.price.recurring?.usage_type === "metered"
    );

    const baseItem = subscription.items.data.find((item) =>
      !item.price.recurring?.usage_type || item.price.recurring.usage_type !== "metered"
    );

    // Upsert billing state
    const tenantBilling = await base44.entities.TenantBilling.filter({
      tenant_id: tenantId,
    });

    const billingData = {
      tenant_id: tenantId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      stripe_subscription_item_id: meteredItem?.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    if (tenantBilling && tenantBilling.length > 0) {
      await base44.entities.TenantBilling.update(tenantBilling[0].id, billingData);
    } else {
      await base44.entities.TenantBilling.create(billingData);
    }

    // Update tenant status
    const tenant = await base44.entities.Tenant.filter({ id: tenantId });
    if (tenant && tenant.length > 0) {
      await base44.entities.Tenant.update(tenantId, {
        billing_status: subscription.status === "trialing" ? "trialing" : "active",
      });
    }

    // Store event
    await base44.entities.BillingEvent.create({
      tenant_id: tenantId,
      event_type: "subscription_created",
      payload_json: {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: stripeCustomerId,
        status: subscription.status,
      },
    });

    return { status: "subscription_created", tenant_id: tenantId };
  } catch (error) {
    console.error("Subscription creation error:", error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) return;

    const tenantBilling = await base44.entities.TenantBilling.filter({
      tenant_id: tenantId,
    });

    if (tenantBilling && tenantBilling.length > 0) {
      await base44.entities.TenantBilling.update(tenantBilling[0].id, {
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
      });
    }

    await base44.entities.BillingEvent.create({
      tenant_id: tenantId,
      event_type: "subscription_updated",
      payload_json: { status: subscription.status },
    });

    return { status: "subscription_updated" };
  } catch (error) {
    console.error("Subscription update error:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) return;

    const tenantBilling = await base44.entities.TenantBilling.filter({
      tenant_id: tenantId,
    });

    if (tenantBilling && tenantBilling.length > 0) {
      await base44.entities.TenantBilling.update(tenantBilling[0].id, {
        status: "canceled",
        canceled_at: new Date(),
      });
    }

    await base44.entities.Tenant.update(tenantId, {
      billing_status: "canceled",
    });

    await base44.entities.BillingEvent.create({
      tenant_id: tenantId,
      event_type: "cancel_confirmed",
      payload_json: {},
    });

    return { status: "subscription_deleted" };
  } catch (error) {
    console.error("Subscription deletion error:", error);
    throw error;
  }
}

async function handleInvoicePaid(invoice) {
  try {
    const tenantId = invoice.metadata?.tenant_id;
    if (!tenantId) return;

    await base44.entities.BillingEvent.create({
      tenant_id: tenantId,
      event_type: "invoice_paid",
      payload_json: {
        stripe_invoice_id: invoice.id,
        amount: invoice.total,
      },
    });

    return { status: "invoice_paid" };
  } catch (error) {
    console.error("Invoice paid error:", error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice) {
  try {
    const tenantId = invoice.metadata?.tenant_id;
    if (!tenantId) return;

    // Update tenant status to past_due
    await base44.entities.Tenant.update(tenantId, {
      billing_status: "past_due",
    });

    await base44.entities.BillingEvent.create({
      tenant_id: tenantId,
      event_type: "invoice_failed",
      payload_json: {
        stripe_invoice_id: invoice.id,
        amount: invoice.total,
      },
    });

    return { status: "invoice_failed" };
  } catch (error) {
    console.error("Invoice failure error:", error);
    throw error;
  }
}