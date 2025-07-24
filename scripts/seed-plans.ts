#!/usr/bin/env tsx

import { db } from '@/lib/db';
import { plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const samplePlans = [
  {
    name: 'Free',
    stripePriceId: 'price_free', // This would be a real Stripe price ID in production
    features: {
      basic_features: true,
      api_requests: true,
      community_support: true,
    },
  },
  {
    name: 'Pro',
    stripePriceId: 'price_1234567890', // This would be a real Stripe price ID in production
    features: {
      basic_features: true,
      api_requests: true,
      community_support: true,
      premium_features: true,
      ai_analysis: true,
      priority_support: true,
      advanced_analytics: true,
    },
  },
  {
    name: 'Enterprise',
    stripePriceId: 'price_enterprise', // This would be a real Stripe price ID in production
    features: {
      basic_features: true,
      api_requests: true,
      community_support: true,
      premium_features: true,
      ai_analysis: true,
      priority_support: true,
      advanced_analytics: true,
      white_label: true,
      custom_integrations: true,
      dedicated_support: true,
      sla_guarantee: true,
    },
  },
];

async function seedPlans() {
  console.log('🌱 Seeding subscription plans...');

  try {
    for (const planData of samplePlans) {
      // Check if plan already exists
      const existingPlan = await db.query.plans.findFirst({
        where: eq(plans.stripePriceId, planData.stripePriceId),
      });

      if (existingPlan) {
        console.log(`Plan "${planData.name}" already exists, skipping...`);
        continue;
      }

      // Insert the plan
      await db.insert(plans).values({
        name: planData.name,
        stripePriceId: planData.stripePriceId,
        features: planData.features,
      });

      console.log(`✅ Created plan: ${planData.name}`);
    }

    console.log('🎉 Plans seeded successfully!');

    // List all plans
    const allPlans = await db.query.plans.findMany();
    console.log('\n📋 Current plans in database:');
    allPlans.forEach(plan => {
      console.log(`  - ${plan.name} (${plan.stripePriceId})`);
      console.log(
        `    Features: ${Object.keys(plan.features).length} features`,
      );
    });
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seeder
seedPlans().catch(error => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
