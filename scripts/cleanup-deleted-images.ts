/**
 * CLI: Delete local image files that were removed via approved suggestions.
 *
 * Usage:
 *   npx tsx scripts/cleanup-deleted-images.ts
 *
 * What it does:
 *   1. Reads all docs from Firestore `deletedImages` collection
 *   2. For each doc, deletes the file at public/{path}
 *   3. Removes the Firestore doc once the file is deleted (or already missing)
 *
 * Requires .env.local with FIREBASE_ADMIN_* variables.
 */

import * as path from "path";
import * as fs from "fs";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

async function main() {
  const snap = await db.collection("deletedImages").get();

  if (snap.empty) {
    console.log("No deleted images to clean up.");
    return;
  }

  let deleted = 0;
  let missing = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const imagePath: string = data.path ?? "";
    if (!imagePath) {
      await doc.ref.delete();
      continue;
    }

    // Normalize: strip leading slash if present
    const normalized = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
    const fullPath = path.join(PUBLIC_DIR, normalized);

    if (!fs.existsSync(fullPath)) {
      console.log(`[skip] Already missing: ${normalized}`);
      missing++;
      await doc.ref.delete();
      continue;
    }

    try {
      fs.unlinkSync(fullPath);
      console.log(`[deleted] ${normalized}`);
      deleted++;
      await doc.ref.delete();
    } catch (err) {
      console.error(`[error] Could not delete ${normalized}:`, err);
      failed++;
    }
  }

  console.log(`\nDone. deleted=${deleted} already-missing=${missing} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
