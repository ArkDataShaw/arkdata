import { base44 } from "@/api/base44Client";

/**
 * Backfill provenance flags on existing people/companies/visitors
 * This runs once after enabling pixel-only mode or as a migration
 */
export async function backfillPixelProvenance(tenantId) {
  console.log(`[Backfill] Starting provenance backfill for tenant ${tenantId}`);

  try {
    // Step 1: Identify visitors with pixel sessions
    const visitors = await base44.entities.Visitor.filter(
      { tenant_id: tenantId },
      "created_date",
      1000
    );

    const pixelVisitorIds = new Set();

    for (const visitor of visitors) {
      // Check if this visitor has any sessions
      const sessions = await base44.entities.Session.filter(
        { tenant_id: tenantId, visitor_id: visitor.id },
        "created_date",
        1
      );

      if (sessions?.length > 0) {
        // Assume sessions from pixel since RawEvents only create pixel sessions
        pixelVisitorIds.add(visitor.id);

        // Mark visitor as pixel-anchored
        if (!visitor.has_pixel_activity) {
          await base44.entities.Visitor.update(visitor.id, {
            has_pixel_activity: true,
            first_pixel_seen_at: sessions[0].started_at,
          });
        }
      }
    }

    // Step 2: Backfill people with pixel anchors
    const people = await base44.entities.Person.filter(
      { tenant_id: tenantId },
      "created_date",
      5000
    );

    for (const person of people) {
      // If person is linked to a pixel visitor, mark as anchored
      if (person.person_id && pixelVisitorIds.has(person.person_id)) {
        await base44.entities.Person.update(person.id, {
          has_pixel_anchor: true,
          pixel_anchor_visitor_id: person.person_id,
          source_primary: "pixel",
        });
      } else if (person.source === "pixel") {
        // Person created via pixel, assume anchored
        await base44.entities.Person.update(person.id, {
          has_pixel_anchor: true,
          source_primary: "pixel",
        });
      } else {
        // Non-pixel source
        await base44.entities.Person.update(person.id, {
          has_pixel_anchor: false,
          source_primary: person.source || "manual",
        });
      }
    }

    // Step 3: Backfill companies similarly
    const companies = await base44.entities.Company.filter(
      { tenant_id: tenantId },
      "created_date",
      5000
    );

    for (const company of companies) {
      // Check if any visitors associated with this company have pixel activity
      const companyVisitors = await base44.entities.Visitor.filter(
        { tenant_id: tenantId, company_id: company.id },
        "created_date",
        10
      );

      const hasPixelLink =
        companyVisitors?.some((v) => pixelVisitorIds.has(v.id)) || false;

      await base44.entities.Company.update(company.id, {
        has_pixel_anchor: hasPixelLink,
        source_primary: hasPixelLink ? "pixel" : "integration",
      });
    }

    console.log(
      `[Backfill] Completed for tenant ${tenantId}. Processed ${people.length} people, ${companies.length} companies`
    );

    return {
      status: "success",
      peopleProcessed: people.length,
      companiesProcessed: companies.length,
    };
  } catch (error) {
    console.error(`[Backfill] Error for tenant ${tenantId}:`, error.message);
    throw error;
  }
}

/**
 * Audit provenance consistency for a tenant
 */
export async function auditPixelProvenance(tenantId) {
  try {
    const people = await base44.entities.Person.filter(
      { tenant_id: tenantId, has_pixel_anchor: false },
      "created_date",
      100
    );

    const companies = await base44.entities.Company.filter(
      { tenant_id: tenantId, has_pixel_anchor: false },
      "created_date",
      100
    );

    return {
      nonPixelPeopleCount: people?.length || 0,
      nonPixelCompaniesCount: companies?.length || 0,
      sampleNonPixelPeople: people?.slice(0, 5) || [],
      sampleNonPixelCompanies: companies?.slice(0, 5) || [],
    };
  } catch (error) {
    console.error(`[Audit] Error for tenant ${tenantId}:`, error.message);
    throw error;
  }
}