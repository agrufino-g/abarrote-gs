const fs = require('fs');
let code = fs.readFileSync('src/app/api/mercadopago/webhook/route.ts', 'utf8');

// Add imports for db
if (!code.includes('import { db }')) {
  code = code.replace(
    "import { logAudit } from '@/lib/audit';",
    "import { logAudit } from '@/lib/audit';\nimport { db } from '@/db';\nimport { mercadopagoPayments } from '@/db/schema';"
  );
}

// Add DB insert logic
const dbUpdateStr = `// Aseguramos trazabilidad en la base de datos de auditoría`;
const replaceStr = `await db.insert(mercadopagoPayments).values({
                        id: \`mp-\${crypto.randomUUID()}\`,
                        paymentId: paymentId || 'unknown',
                        status: paymentData.status || 'unknown',
                        externalReference: paymentData.external_reference || null,
                        amount: String(paymentData.transaction_amount || 0)
                    }).onConflictDoUpdate({
                        target: mercadopagoPayments.paymentId,
                        set: {
                            status: paymentData.status || 'unknown',
                            amount: String(paymentData.transaction_amount || 0)
                        }
                    });

                    // Aseguramos trazabilidad en la base de datos de auditoría`;

code = code.replace(dbUpdateStr, replaceStr);
fs.writeFileSync('src/app/api/mercadopago/webhook/route.ts', code);
