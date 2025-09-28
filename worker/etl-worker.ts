import { unpdf } from 'unpdf';
// --- TYPES ---
interface R2Object {
  key: string;
  customMetadata?: {
    userId?: string;
  };
}
interface R2ObjectWithMetadata extends R2Object {
    customMetadata: {
        userId: string;
    };
}
interface QueueMessage {
  objects: R2Object[];
}
type Env = {
  UPLOADS_BUCKET: R2Bucket;
  DB: D1Database;
  AI: any;
  ETL_QUEUE: Queue;
};
interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
}
interface NormalizedTransaction extends ParsedTransaction {
  hash_v1: string;
}
interface EnrichedTransaction extends NormalizedTransaction {
    category: string;
    is_anomaly: boolean;
    anomaly_reason?: string;
}
// --- ETL WORKER ---
const EtlWorker = {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      console.log(`Received message: ${JSON.stringify(message.body)}`);
      for (const object of message.body.objects) {
        try {
          await processR2Object(object, env);
          console.log(`Successfully processed ${object.key}`);
        } catch (error) {
          console.error(`Failed to process ${object.key}:`, error);
          // Optionally, you could move the message to a dead-letter queue here
        }
      }
    }
  },
};
export default EtlWorker;
// --- CORE LOGIC ---
async function processR2Object(r2Object: R2Object, env: Env) {
  console.log(`[ETL] 1. FETCH: Starting processing for R2 object: ${r2Object.key}`);
  const file = await env.UPLOADS_BUCKET.get(r2Object.key);
  if (!file) throw new Error(`File not found in R2: ${r2Object.key}`);
  const userId = file.customMetadata?.userId;
  if (!userId) {
    throw new Error(`Missing userId in R2 metadata for ${r2Object.key}. Aborting.`);
  }
  const fileBuffer = await file.arrayBuffer();
  const fileHash = await sha256(fileBuffer);
  const existingStatement = await env.DB.prepare('SELECT id FROM statements WHERE file_hash = ?').bind(fileHash).first();
  if (existingStatement) {
    console.log(`[ETL] SKIP: File with hash ${fileHash} has already been processed.`);
    return;
  }
  const { account, statement } = await upsertAccountAndStatement(file.key, fileHash, userId, env);
  try {
    const parsedTransactions = await parseDocument(fileBuffer);
    const normalizedTransactions = normalizeData(parsedTransactions);
    const uniqueTransactions = await deduplicateTransactions(normalizedTransactions, env);
    if (uniqueTransactions.length > 0) {
        const enrichedTransactions = await enrichWithAI(uniqueTransactions, env);
        await upsertTransactions(enrichedTransactions, statement.id, account.id, userId, env);
    }
    await env.DB.prepare('UPDATE statements SET status = ? WHERE id = ?').bind('completed', statement.id).run();
    console.log(`[ETL] 6. COMPLETE: Finished processing for ${r2Object.key}`);
  } catch (error) {
    await env.DB.prepare('UPDATE statements SET status = ? WHERE id = ?').bind('error', statement.id).run();
    throw error;
  }
}
// --- AI ENRICHMENT ---
async function enrichWithAI(transactions: NormalizedTransaction[], env: Env): Promise<EnrichedTransaction[]> {
    console.log(`[ETL] AI: Enriching ${transactions.length} transactions...`);
    // This function remains the same as before
    const BATCH_SIZE = 10;
    const enriched: EnrichedTransaction[] = [];
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const batch = transactions.slice(i, i + BATCH_SIZE);
        const prompt = createAIPrompt(batch);
        try {
            const response = await env.AI.fetch(
                new Request("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "@cf/meta/llama-2-7b-chat-fp16",
                        messages: [{ role: "user", content: prompt }],
                        response_format: { type: "json_object" },
                        temperature: 0.2,
                    }),
                })
            );
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI API error: ${response.status} ${errorText}`);
            }
            const aiResult = await response.json() as any;
            const content = JSON.parse(aiResult.choices[0].message.content);
            const processedBatch = batch.map((tx, index) => {
                const aiData = content.transactions[index] || {};
                return {
                    ...tx,
                    category: aiData.category || 'Uncategorized',
                    is_anomaly: aiData.is_anomaly || false,
                    anomaly_reason: aiData.anomaly_reason,
                };
            });
            enriched.push(...processedBatch);
        } catch (error) {
            console.error("AI enrichment for batch failed:", error);
            const unprocessedBatch = batch.map(tx => ({ ...tx, category: 'Uncategorized', is_anomaly: false }));
            enriched.push(...unprocessedBatch);
        }
    }
    return enriched;
}
function createAIPrompt(transactions: NormalizedTransaction[]): string {
    const transactionList = transactions.map(tx =>
        `- Date: ${tx.date}, Description: "${tx.description}", Amount: ${tx.amount.toFixed(2)}`
    ).join('\n');
    return `
Analyze the following financial transactions. For each transaction, provide a category and determine if it's an anomaly.
Categories: Dining, Groceries, Travel, Shopping, Utilities, Rent/Mortgage, Income, Transfers, Health, Entertainment, Other.
An anomaly is a transaction that is unusually large, occurs at an odd time, or has a suspicious description.
Respond with a JSON object containing a single key "transactions". This key should be an array of objects, one for each transaction in the same order as the input. Each object must have these keys:
- "category": (string) The assigned category.
- "is_anomaly": (boolean) True if it's an anomaly, otherwise false.
- "anomaly_reason": (string or null) A brief explanation if it is an anomaly, otherwise null.
Transactions:
${transactionList}
`;
}
// --- HELPER FUNCTIONS ---
async function parseDocument(buffer: ArrayBuffer): Promise<ParsedTransaction[]> {
  console.log('[ETL] 2. PARSE: Parsing document...');
  const { text } = await unpdf(buffer);
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
  const transactionRegex = /(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})/;
  for (const line of lines) {
    const match = line.match(transactionRegex);
    if (match) {
      const [, date, description, amountStr] = match;
      const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
      const [month, day] = date.split('/');
      transactions.push({
        date: `${year}-${month}-${day}`,
        description: description.trim(),
        amount: amount,
      });
    }
  }
  console.log(`[ETL] Parsed ${transactions.length} potential transactions.`);
  return transactions;
}
function normalizeData(transactions: ParsedTransaction[]): NormalizedTransaction[] {
  console.log('[ETL] 3. NORMALIZE: Normalizing data and generating hashes...');
  return transactions.map(tx => ({
    ...tx,
    description: tx.description.replace(/\s+/g, ' ').trim(),
    hash_v1: createTransactionHash(tx),
  }));
}
async function deduplicateTransactions(transactions: NormalizedTransaction[], env: Env): Promise<NormalizedTransaction[]> {
  console.log('[ETL] 4. DEDUP: Checking for existing transactions in D1...');
  if (transactions.length === 0) return [];
  const hashes = transactions.map(tx => tx.hash_v1);
  const placeholders = hashes.map(() => '?').join(',');
  const stmt = env.DB.prepare(`SELECT hash_v1 FROM transactions WHERE hash_v1 IN (${placeholders})`);
  const { results } = await stmt.bind(...hashes).all<{ hash_v1: string }>();
  const existingHashes = new Set(results.map(r => r.hash_v1));
  const newTransactions = transactions.filter(tx => !existingHashes.has(tx.hash_v1));
  console.log(`[ETL] Found ${newTransactions.length} new transactions out of ${transactions.length}.`);
  return newTransactions;
}
async function upsertAccountAndStatement(fileKey: string, fileHash: string, userId: string, env: Env) {
  console.log('[ETL] UPSERT: Creating account and statement records...');
  const accountId = `acc_${userId.substring(0, 8)}`; // Simple account ID for demo
  await env.DB.prepare(
    `INSERT INTO accounts (id, user_id, name, institution, type) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`
  ).bind(accountId, userId, 'Primary Checking', 'First National Bank', 'checking').run();
  const statementId = `stmt_${crypto.randomUUID()}`;
  const today = new Date().toISOString().split('T')[0];
  await env.DB.prepare(
    `INSERT INTO statements (id, account_id, user_id, statement_date, start_date, end_date, source_file_key, file_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(statementId, accountId, userId, today, today, today, fileKey, fileHash, 'processing').run();
  return { account: { id: accountId }, statement: { id: statementId } };
}
async function upsertTransactions(transactions: EnrichedTransaction[], statementId: string, accountId: string, userId: string, env: Env) {
  console.log(`[ETL] 5. UPSERT: Writing ${transactions.length} transactions and insights to D1...`);
  if (transactions.length === 0) return;
  const transactionInserts: D1PreparedStatement[] = [];
  const insightInserts: D1PreparedStatement[] = [];
  transactions.forEach(tx => {
    const txId = `txn_${crypto.randomUUID()}`;
    transactionInserts.push(
      env.DB.prepare(
        `INSERT INTO transactions (id, statement_id, account_id, user_id, date, description, amount, hash_v1, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(txId, statementId, accountId, userId, tx.date, tx.description, tx.amount, tx.hash_v1, tx.category)
    );
    if (tx.is_anomaly && tx.anomaly_reason) {
      insightInserts.push(
        env.DB.prepare(
          `INSERT INTO insights (id, user_id, type, content, related_transaction_id, date) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(`ins_${crypto.randomUUID()}`, userId, 'Anomaly', tx.anomaly_reason, txId, tx.date)
      );
    }
  });
  await env.DB.batch([...transactionInserts, ...insightInserts]);
  console.log(`[ETL] Successfully inserted ${transactionInserts.length} transactions and ${insightInserts.length} insights.`);
}
function createTransactionHash(tx: ParsedTransaction): string {
  const cleanDescription = tx.description.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${tx.date}-${cleanDescription}-${Math.abs(tx.amount).toFixed(2)}`;
}
async function sha256(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}