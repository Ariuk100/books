/**
 * CLI: Firebase Storage-д байгаа зургуудыг public/images/ руу шилжүүлэх.
 *
 * Usage:
 *   npx tsx scripts/move-added-images.ts
 *
 * Хийдэг зүйл:
 *   1. Firestore `addedImages` collection уншина
 *   2. Firebase Storage-аас файлыг public/images/{bookId}/{filename} руу татна
 *   3. Firestore section body дотор storageUrl → localPath-аар орлуулна
 *   4. Firebase Storage-аас файлыг устгана
 *   5. `addedImages` doc-ийг устгана
 *
 * Requires .env.local with FIREBASE_ADMIN_* variables.
 */

import * as path from "path";
import * as fs from "fs";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const bucket = getStorage().bucket();
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

// Firestore section body дотор src-г орлуулах
function replaceUrlInBody(body: unknown[], storageUrl: string, localPath: string): { updated: unknown[]; changed: boolean } {
  let changed = false;
  const updated = body.map((block: unknown) => {
    const b = block as Record<string, unknown>;
    if (b.type === "image" && b.src === storageUrl) {
      changed = true;
      return { ...b, src: localPath };
    }
    // Problem block дотор statement/solution-д байж болно
    if (b.type === "problem") {
      const stmtResult = replaceUrlInBody((b.statement as unknown[]) ?? [], storageUrl, localPath);
      const solResult  = replaceUrlInBody((b.solution  as unknown[]) ?? [], storageUrl, localPath);
      if (stmtResult.changed || solResult.changed) {
        changed = true;
        return { ...b, statement: stmtResult.updated, solution: solResult.updated };
      }
    }
    return block;
  });
  return { updated, changed };
}

async function main() {
  const snap = await db.collection("addedImages").get();

  if (snap.empty) {
    console.log("Шилжүүлэх зураг байхгүй байна.");
    return;
  }

  let moved = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const { storagePath, storageUrl, localPath, bookId, chapterId, sectionId } = data as {
      storagePath: string;
      storageUrl: string;
      localPath: string;
      bookId: string;
      chapterId: string;
      sectionId: string;
    };

    if (!storagePath || !localPath || !bookId || !chapterId || !sectionId) {
      console.warn(`[skip] Дутуу мэдээлэл: ${doc.id}`);
      await doc.ref.delete();
      continue;
    }

    const destPath = path.join(PUBLIC_DIR, localPath);
    const destDir  = path.dirname(destPath);

    try {
      // 1. public/images/{bookId}/ хавтас үүсгэх
      fs.mkdirSync(destDir, { recursive: true });

      // 2. Firebase Storage-аас татах
      await bucket.file(storagePath).download({ destination: destPath });
      console.log(`[татсан] ${storagePath} → ${localPath}`);

      // 3. Firestore section body дотор URL орлуулах
      const sectionRef = db
        .collection("books").doc(bookId)
        .collection("chapters").doc(chapterId)
        .collection("sections").doc(sectionId);

      const sectionSnap = await sectionRef.get();
      if (sectionSnap.exists) {
        const rawBody = sectionSnap.data()!.body;
        const body: unknown[] = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

        const { updated, changed } = replaceUrlInBody(body, storageUrl, localPath);

        if (changed) {
          await sectionRef.update({ body: JSON.stringify(updated), updatedAt: Date.now() });
          console.log(`[засагдсан] ${sectionId} — src → ${localPath}`);
        } else {
          console.warn(`[анхаар] ${sectionId}-д storageUrl олдсонгүй, body засагдаагүй`);
        }
      } else {
        console.warn(`[анхаар] Section олдсонгүй: ${sectionId}`);
      }

      // 4. Firebase Storage-аас устгах
      await bucket.file(storagePath).delete().catch(() => {
        console.warn(`[анхаар] Storage файл устгаж чадсангүй: ${storagePath}`);
      });

      // 5. addedImages doc устгах
      await doc.ref.delete();
      moved++;
    } catch (err) {
      console.error(`[алдаа] ${localPath}:`, err);
      failed++;
    }
  }

  console.log(`\nДуусав. шилжсэн=${moved} алдаа=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
