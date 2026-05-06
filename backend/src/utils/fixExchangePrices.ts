/**
 * Run: npx ts-node src/utils/fixExchangePrices.ts
 * Fixes stations where exchangePrice > fillPrice (violates schema validation).
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

async function fix() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gasgo';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const { Station } = await import('../models/Station');

  const stations = await Station.find({});
  let fixed = 0;

  for (const station of stations) {
    let changed = false;
    for (const listing of station.cylinderListings) {
      if (listing.exchangePrice > listing.fillPrice) {
        console.log(`  Fixing ${station.name} — ${listing.size}kg: exchangePrice ${listing.exchangePrice} > fillPrice ${listing.fillPrice}`);
        listing.exchangePrice = Math.floor(listing.fillPrice * 0.85); // set to 85% of fill price
        changed = true;
      }
    }
    if (changed) {
      // Use updateOne to bypass the pre-validate hook that's causing the issue
      await Station.updateOne(
        { _id: station._id },
        { $set: { cylinderListings: station.cylinderListings } }
      );
      fixed++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} station(s)`);
  console.log('🎉 Done!');
  process.exit(0);
}

fix().catch((err) => {
  console.error('Fix failed:', err);
  process.exit(1);
});
