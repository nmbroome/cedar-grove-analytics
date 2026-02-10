import { getAdminDb } from "@/firebase/admin";

const MERCURY_BASE_URL = "https://api.mercury.com/api/v1";
const ACCOUNT_ID = "51275c28-043f-11f0-a6df-2b58241f41a4";
const PAGE_LIMIT = 500;

export async function POST() {
  const token = process.env.MERCURY_API_TOKEN;
  if (!token) {
    return Response.json(
      { success: false, error: "MERCURY_API_TOKEN is not configured" },
      { status: 500 }
    );
  }

  try {
    // Fetch all transactions with pagination
    let allTransactions = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `${MERCURY_BASE_URL}/account/${ACCOUNT_ID}/transactions?limit=${PAGE_LIMIT}&offset=${offset}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        return Response.json(
          { success: false, error: `Mercury API error: ${res.status} ${text}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const transactions = data.transactions || [];
      allTransactions = allTransactions.concat(transactions);

      if (transactions.length < PAGE_LIMIT) {
        hasMore = false;
      } else {
        offset += PAGE_LIMIT;
      }
    }

    // Upsert each transaction into Firestore in batches of 500
    const adminDb = getAdminDb();
    const BATCH_SIZE = 500;
    for (let i = 0; i < allTransactions.length; i += BATCH_SIZE) {
      const chunk = allTransactions.slice(i, i + BATCH_SIZE);
      const batch = adminDb.batch();
      for (const txn of chunk) {
        const docRef = adminDb.collection("transactions").doc(txn.id);
        batch.set(docRef, txn);
      }
      await batch.commit();
    }

    return Response.json({ success: true, synced: allTransactions.length });
  } catch (err) {
    console.error("Sync transactions error:", err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
