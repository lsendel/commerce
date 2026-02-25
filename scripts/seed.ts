import "dotenv/config";
import { eq } from "drizzle-orm";
import { createDb } from "../src/infrastructure/db/client";
import {
  products,
  productVariants,
  productImages,
  collections,
  collectionProducts,
  bookingSettings,
  bookingConfig,
  subscriptionPlans,
  stores,
} from "../src/infrastructure/db/schema";

async function main() {
  const db = createDb(process.env.DATABASE_URL!);
  const defaultStoreId =
    process.env.DEFAULT_STORE_ID ?? "00000000-0000-4000-8000-000000000001";

  const existingStore = await db
    .select()
    .from(stores)
    .where(eq(stores.id, defaultStoreId))
    .limit(1);

  if (existingStore.length === 0) {
    await db.insert(stores).values({
      id: defaultStoreId,
      name: "petm8",
      slug: "petm8",
      subdomain: "petm8",
      status: "active",
    });
  }

  console.log("Seeding database...");

  // ─── Collections ────────────────────────────────────────────────────────────

  const [accessoriesCollection] = await db
    .insert(collections)
    .values({
      storeId: defaultStoreId,
      name: "Accessories",
      slug: "accessories",
      description:
        "Stylish accessories for pet lovers. From tote bags to mugs, show off your love for your furry friends.",
      seoTitle: "Pet Accessories | Petm8",
      seoDescription:
        "Browse our collection of pet-themed accessories including tote bags, mugs, and more.",
      imageUrl: "https://images.petm8.io/collections/accessories-hero.jpg",
    })
    .returning();

  const [digitalCollection] = await db
    .insert(collections)
    .values({
      storeId: defaultStoreId,
      name: "Digital",
      slug: "digital",
      description:
        "Digital products and subscriptions for modern pet parents. Guides, plans, and premium features.",
      seoTitle: "Digital Products | Petm8",
      seoDescription:
        "Explore our digital products including pet care guides and premium subscription plans.",
      imageUrl: "https://images.petm8.io/collections/digital-hero.jpg",
    })
    .returning();

  console.log(
    `  Created collections: ${accessoriesCollection.name}, ${digitalCollection.name}`,
  );

  // ─── Physical Product 1: Paw Print Tote Bag ────────────────────────────────

  const [toteBag] = await db
    .insert(products)
    .values({
      storeId: defaultStoreId,
      name: "Paw Print Tote Bag",
      slug: "paw-print-tote-bag",
      description:
        "A durable canvas tote bag featuring an adorable paw print design. Perfect for trips to the pet store, farmer's market, or everyday errands. Made from 100% organic cotton with reinforced handles.",
      descriptionHtml:
        '<p>A durable canvas tote bag featuring an adorable paw print design. Perfect for trips to the pet store, farmer\'s market, or everyday errands.</p><ul><li>100% organic cotton</li><li>Reinforced handles</li><li>Interior pocket</li><li>Machine washable</li></ul>',
      type: "physical",
      availableForSale: true,
      featuredImageUrl:
        "https://images.petm8.io/products/paw-print-tote/main.jpg",
      seoTitle: "Paw Print Tote Bag | Petm8",
      seoDescription:
        "Durable organic cotton tote bag with paw print design. Perfect for pet lovers on the go.",
    })
    .returning();

  const toteBagVariants = await db
    .insert(productVariants)
    .values([
      {
        productId: toteBag.id,
        title: "Natural / Standard",
        sku: "TOTE-NAT-STD",
        price: "24.99",
        compareAtPrice: "29.99",
        inventoryQuantity: 150,
        options: { color: "Natural", size: "Standard" },
        availableForSale: true,
      },
      {
        productId: toteBag.id,
        title: "Black / Standard",
        sku: "TOTE-BLK-STD",
        price: "24.99",
        inventoryQuantity: 120,
        options: { color: "Black", size: "Standard" },
        availableForSale: true,
      },
      {
        productId: toteBag.id,
        title: "Natural / Large",
        sku: "TOTE-NAT-LRG",
        price: "29.99",
        inventoryQuantity: 80,
        options: { color: "Natural", size: "Large" },
        availableForSale: true,
      },
    ])
    .returning();

  await db.insert(productImages).values([
    {
      productId: toteBag.id,
      url: "https://images.petm8.io/products/paw-print-tote/main.jpg",
      altText: "Paw Print Tote Bag - front view",
      position: 0,
    },
    {
      productId: toteBag.id,
      url: "https://images.petm8.io/products/paw-print-tote/detail.jpg",
      altText: "Paw Print Tote Bag - paw print detail",
      position: 1,
    },
    {
      productId: toteBag.id,
      url: "https://images.petm8.io/products/paw-print-tote/lifestyle.jpg",
      altText: "Paw Print Tote Bag - lifestyle shot at farmer's market",
      position: 2,
    },
  ]);

  console.log(
    `  Created product: ${toteBag.name} (${toteBagVariants.length} variants)`,
  );

  // ─── Physical Product 2: Pet Portrait Mug ──────────────────────────────────

  const [mug] = await db
    .insert(products)
    .values({
      storeId: defaultStoreId,
      name: "Pet Portrait Mug",
      slug: "pet-portrait-mug",
      description:
        "Start your morning with your best friend! This ceramic mug features a charming watercolor-style pet portrait. Dishwasher and microwave safe. 11oz capacity with a comfortable C-handle.",
      descriptionHtml:
        "<p>Start your morning with your best friend! This ceramic mug features a charming watercolor-style pet portrait.</p><ul><li>Premium white ceramic</li><li>11oz or 15oz capacity</li><li>Dishwasher &amp; microwave safe</li><li>Comfortable C-handle</li></ul>",
      type: "physical",
      availableForSale: true,
      featuredImageUrl:
        "https://images.petm8.io/products/pet-portrait-mug/main-v2.jpg",
      seoTitle: "Pet Portrait Mug | Petm8",
      seoDescription:
        "Charming watercolor-style pet portrait on a premium ceramic mug. Dishwasher safe.",
    })
    .returning();

  const mugVariants = await db
    .insert(productVariants)
    .values([
      {
        productId: mug.id,
        title: "White / 11oz",
        sku: "MUG-WHT-11",
        price: "18.99",
        inventoryQuantity: 200,
        options: { color: "White", size: "11oz" },
        availableForSale: true,
      },
      {
        productId: mug.id,
        title: "White / 15oz",
        sku: "MUG-WHT-15",
        price: "22.99",
        inventoryQuantity: 100,
        options: { color: "White", size: "15oz" },
        availableForSale: true,
      },
    ])
    .returning();

  await db.insert(productImages).values([
    {
      productId: mug.id,
      url: "https://images.petm8.io/products/pet-portrait-mug/main-v2.jpg",
      altText: "Pet Portrait Mug - front view with dog illustration",
      position: 0,
    },
    {
      productId: mug.id,
      url: "https://images.petm8.io/products/pet-portrait-mug/angle.jpg",
      altText: "Pet Portrait Mug - angled view showing handle",
      position: 1,
    },
    {
      productId: mug.id,
      url: "https://images.petm8.io/products/pet-portrait-mug/lifestyle.jpg",
      altText: "Pet Portrait Mug - on desk with coffee",
      position: 2,
    },
  ]);

  console.log(
    `  Created product: ${mug.name} (${mugVariants.length} variants)`,
  );

  // ─── Digital Product: Pet Care Ultimate Guide ──────────────────────────────

  const [guide] = await db
    .insert(products)
    .values({
      storeId: defaultStoreId,
      name: "Pet Care Ultimate Guide",
      slug: "pet-care-ultimate-guide",
      description:
        "The comprehensive digital guide every pet parent needs. Covers nutrition, training, health care, grooming, and behaviour for dogs and cats. Written by certified veterinarians and animal behaviourists. 180+ pages of expert advice with printable checklists and meal planners.",
      descriptionHtml:
        "<p>The comprehensive digital guide every pet parent needs. Covers nutrition, training, health care, grooming, and behaviour for dogs and cats.</p><h3>What's Inside</h3><ul><li>Nutrition &amp; diet planning</li><li>Positive reinforcement training</li><li>Preventive health care schedules</li><li>Grooming tips by breed</li><li>Behaviour problem solving</li><li>Printable checklists &amp; meal planners</li></ul><p><em>Written by certified veterinarians and animal behaviourists. 180+ pages.</em></p>",
      type: "digital",
      availableForSale: true,
      downloadUrl: "https://downloads.petm8.io/guides/pet-care-ultimate.pdf",
      featuredImageUrl:
        "https://images.petm8.io/products/pet-care-guide/main.jpg",
      seoTitle: "Pet Care Ultimate Guide - Digital Download | Petm8",
      seoDescription:
        "180+ page guide covering nutrition, training, health, and grooming. Written by certified vets.",
    })
    .returning();

  const guideVariants = await db
    .insert(productVariants)
    .values([
      {
        productId: guide.id,
        title: "Digital Download (PDF)",
        sku: "GUIDE-PETCARE-PDF",
        price: "14.99",
        compareAtPrice: "24.99",
        inventoryQuantity: 9999,
        options: { format: "PDF" },
        availableForSale: true,
      },
    ])
    .returning();

  await db.insert(productImages).values([
    {
      productId: guide.id,
      url: "https://images.petm8.io/products/pet-care-guide/main.jpg",
      altText: "Pet Care Ultimate Guide - cover image",
      position: 0,
    },
    {
      productId: guide.id,
      url: "https://images.petm8.io/products/pet-care-guide/preview-pages.jpg",
      altText: "Pet Care Ultimate Guide - sample pages spread",
      position: 1,
    },
  ]);

  console.log(
    `  Created product: ${guide.name} (${guideVariants.length} variant)`,
  );

  // ─── Subscription Product: Petm8 Premium Monthly ──────────────────────────

  const [premium] = await db
    .insert(products)
    .values({
      storeId: defaultStoreId,
      name: "Petm8 Premium Monthly",
      slug: "petm8-premium-monthly",
      description:
        "Unlock the full Petm8 experience with Premium. Get unlimited AI pet portraits, early access to new products, exclusive member discounts, and priority booking for experiences. Cancel anytime.",
      descriptionHtml:
        "<p>Unlock the full Petm8 experience with Premium.</p><h3>Premium Benefits</h3><ul><li>Unlimited AI pet portraits</li><li>Early access to new products</li><li>15% member discount on all purchases</li><li>Priority booking for experiences</li><li>Exclusive monthly digital wallpapers</li><li>Ad-free browsing</li></ul><p><strong>Cancel anytime.</strong> No commitment, no hassle.</p>",
      type: "subscription",
      availableForSale: true,
      stripePriceId: "price_petm8_premium_monthly_placeholder",
      featuredImageUrl:
        "https://images.petm8.io/products/premium/main-v2.jpg",
      seoTitle: "Petm8 Premium Subscription | Petm8",
      seoDescription:
        "Unlimited AI portraits, member discounts, priority booking, and more. Cancel anytime.",
    })
    .returning();

  const premiumVariants = await db
    .insert(productVariants)
    .values([
      {
        productId: premium.id,
        title: "Monthly Plan",
        sku: "SUB-PREMIUM-MO",
        price: "9.99",
        inventoryQuantity: 9999,
        options: { billing: "Monthly" },
        availableForSale: true,
      },
    ])
    .returning();

  await db.insert(productImages).values([
    {
      productId: premium.id,
      url: "https://images.petm8.io/products/premium/main-v2.jpg",
      altText: "Petm8 Premium - membership benefits overview",
      position: 0,
    },
  ]);

  // Create subscription plan record
  await db.insert(subscriptionPlans).values({
    productId: premium.id,
    billingPeriod: "month",
    billingInterval: 1,
    trialDays: 7,
    stripeProductId: "prod_petm8_premium_placeholder",
    stripePriceId: "price_petm8_premium_monthly_placeholder",
  });

  console.log(
    `  Created product: ${premium.name} (${premiumVariants.length} variant + subscription plan)`,
  );

  // ─── Bookable Product: Dog Beach Day Experience ────────────────────────────

  const [beachDay] = await db
    .insert(products)
    .values({
      storeId: defaultStoreId,
      name: "Dog Beach Day Experience",
      slug: "dog-beach-day-experience",
      description:
        "Treat your pup to the ultimate beach day! A guided 3-hour group experience at Bondi Beach with professional dog handlers, water toys, agility games, and a gourmet puppy picnic. Includes professional photos of your dog having the time of their life. Suitable for dogs of all sizes and swimming abilities.",
      descriptionHtml:
        "<p>Treat your pup to the ultimate beach day! A guided 3-hour group experience at Bondi Beach with professional dog handlers.</p><h3>What's Included</h3><ul><li>Professional dog handlers (1 per 4 dogs)</li><li>Water toys &amp; agility equipment</li><li>Gourmet puppy picnic lunch</li><li>Fresh water stations</li><li>Professional photo package (10+ edited photos)</li><li>Doggy bandana souvenir</li></ul><h3>What to Bring</h3><ul><li>Leash &amp; collar with ID tag</li><li>Towel for your dog</li><li>Sunscreen (for you!)</li></ul>",
      type: "bookable",
      availableForSale: true,
      featuredImageUrl:
        "https://images.petm8.io/products/beach-day/main.jpg",
      seoTitle: "Dog Beach Day Experience | Petm8",
      seoDescription:
        "3-hour guided beach experience for dogs at Bondi Beach. Includes handlers, toys, picnic, and professional photos.",
    })
    .returning();

  const beachDayVariants = await db
    .insert(productVariants)
    .values([
      {
        productId: beachDay.id,
        title: "Beach Day Pass",
        sku: "EXP-BEACH-DAY",
        price: "79.00",
        inventoryQuantity: 9999,
        options: { type: "Group Experience" },
        availableForSale: true,
      },
    ])
    .returning();

  await db.insert(productImages).values([
    {
      productId: beachDay.id,
      url: "https://images.petm8.io/products/beach-day/main.jpg",
      altText: "Dogs playing on the beach during a Beach Day Experience",
      position: 0,
    },
    {
      productId: beachDay.id,
      url: "https://images.petm8.io/products/beach-day/agility.jpg",
      altText: "Dog running through agility course on sand",
      position: 1,
    },
    {
      productId: beachDay.id,
      url: "https://images.petm8.io/products/beach-day/picnic.jpg",
      altText: "Gourmet puppy picnic setup on the beach",
      position: 2,
    },
    {
      productId: beachDay.id,
      url: "https://images.petm8.io/products/beach-day/group.jpg",
      altText: "Group of happy dogs and owners at the beach",
      position: 3,
    },
  ]);

  // Booking settings
  await db.insert(bookingSettings).values({
    productId: beachDay.id,
    duration: 180,
    durationUnit: "minutes",
    capacityType: "group",
    capacityPerSlot: 12,
    cutOffTime: 24,
    cutOffUnit: "hours",
    maxAdvanceTime: 60,
    maxAdvanceUnit: "days",
    minParticipants: 3,
    enableWaitlist: true,
    enablePrivateEvent: true,
    minPrivateSize: 6,
    maxPrivateSize: 12,
  });

  // Booking config
  await db.insert(bookingConfig).values({
    productId: beachDay.id,
    location: "Bondi Beach, Sydney NSW 2026, Australia",
    included: [
      "Professional dog handlers (1 per 4 dogs)",
      "Water toys & agility equipment",
      "Gourmet puppy picnic lunch",
      "Fresh water stations",
      "Professional photo package (10+ edited photos)",
      "Doggy bandana souvenir",
    ],
    notIncluded: [
      "Transport to/from venue",
      "Human food & beverages",
      "Pet insurance",
    ],
    itinerary: [
      {
        time: "09:00",
        title: "Check-in & Welcome",
        description:
          "Meet the handlers, temperament check, and off-leash warm-up.",
      },
      {
        time: "09:30",
        title: "Beach Free Play",
        description: "Supervised off-leash play in the water and on the sand.",
      },
      {
        time: "10:15",
        title: "Agility Games",
        description:
          "Fun obstacle course and fetch competitions on the beach.",
      },
      {
        time: "11:00",
        title: "Puppy Picnic",
        description:
          "Gourmet dog-friendly treats and fresh water. Humans can relax!",
      },
      {
        time: "11:30",
        title: "Photo Session & Wrap-up",
        description:
          "Professional photos, bandana distribution, and farewell.",
      },
    ],
    faqs: [
      {
        question: "Is my dog suitable for this experience?",
        answer:
          "Dogs of all sizes and swimming abilities are welcome. However, dogs must be socialised and comfortable around other dogs. Aggressive dogs cannot participate for safety reasons.",
      },
      {
        question: "What if it rains?",
        answer:
          "Light rain is fine — dogs love it! For severe weather, we'll reschedule to the next available date at no cost. You'll be notified by 7am on the day.",
      },
      {
        question: "Can I stay and watch?",
        answer:
          "Absolutely! Owners are welcome to stay and enjoy the beach. We find dogs are more relaxed when their humans are nearby.",
      },
      {
        question: "How do I receive the photos?",
        answer:
          "Professional photos will be delivered via email within 48 hours of the experience as a downloadable gallery link.",
      },
    ],
    cancellationPolicy:
      "Free cancellation up to 48 hours before the scheduled time. Cancellations within 48 hours receive a 50% refund. No-shows are non-refundable.",
  });

  console.log(
    `  Created product: ${beachDay.name} (${beachDayVariants.length} variant + booking settings/config)`,
  );

  // ─── Collection-Product Associations ───────────────────────────────────────

  await db.insert(collectionProducts).values([
    // Accessories collection: physical products
    {
      collectionId: accessoriesCollection.id,
      productId: toteBag.id,
      position: 0,
    },
    {
      collectionId: accessoriesCollection.id,
      productId: mug.id,
      position: 1,
    },
    // Digital collection: guide + subscription
    {
      collectionId: digitalCollection.id,
      productId: guide.id,
      position: 0,
    },
    {
      collectionId: digitalCollection.id,
      productId: premium.id,
      position: 1,
    },
  ]);

  console.log("  Linked products to collections");
  console.log("Seed complete.");
}

main().catch(console.error);
