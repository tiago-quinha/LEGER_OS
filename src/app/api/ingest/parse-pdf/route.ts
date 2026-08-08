import { NextResponse } from "next/server";
// @ts-ignore
import pdfParse from "pdf-parse";
import { spawn } from "child_process";
import path from "path";
import { createClient } from "@/lib/supabase-server";

// Multi-lingual column header detection keywords
const OUTFLOW_HEADER_KEYWORDS = [
  'saída', 'saida', 'débito', 'debito', 'levantamento', 'compra', 'pagamento', 'cargo', 'despesa', 'enviado', 'imposto', 'comissão', 'comissao', 'tarifa', 'anuidade', 'retirada', 'retirado',
  'outflow', 'exit', 'debit', 'withdrawal', 'charge', 'spent', 'paid out', 'money out', 'expense', 'purchase', 'payment', 'transfer to', 'fee', 'sent', 'bill', 'atm',
  'salida', 'cargo', 'retiro', 'gasto', 'pago', 'transferencia a', 'comisión', 'comision', 'reintegro',
  'sortie', 'débit', 'debit', 'retrait', 'dépense', 'depense', 'achat', 'paiement', 'virement vers', 'frais', 'prélèvement', 'prelevement',
  'ausgang', 'ausgabe', 'ausgaben', 'lastschrift', 'abhebung', 'kauf', 'zahlung', 'überweisung an', 'uberweisung an', 'soll', 'entnahme', 'gebühr', 'gebuehr',
  'uscita', 'uscite', 'addebito', 'prelievo', 'spesa', 'acquisto', 'pagamento', 'bonifico a', 'dare',
  'uitgaand', 'uitgaven', 'af', 'debet', 'opname', 'betaling', 'overboeking naar', 'aankoop', 'kosten'
];

const INFLOW_HEADER_KEYWORDS = [
  'entrada', 'crédito', 'credito', 'depósito', 'deposito', 'ordenado', 'salário', 'salario', 'vencimento', 'recebido', 'reembolso', 'devolução', 'devolucao', 'prémio', 'premio', 'rewards', 'abono', 'rendimento',
  'inflow', 'entry', 'credit', 'deposit', 'income', 'salary', 'payroll', 'paycheck', 'received', 'paid in', 'money in', 'refund', 'reimbursement', 'reward', 'topup', 'top-up', 'transfer from', 'interest', 'cashback',
  'abono', 'ingreso', 'nómina', 'nomina', 'sueldo', 'salario', 'recibido', 'reembolso', 'devolución', 'devolucion', 'intereses',
  'entrée', 'entree', 'crédit', 'credit', 'dépôt', 'depot', 'revenu', 'salaire', 'paye', 'reçu', 'recu', 'remboursement', 'virement de', 'intérêts',
  'eingang', 'einnahme', 'einnahmen', 'gutschrift', 'einzahlung', 'gehalt', 'lohn', 'erhalten', 'erstattung', 'rückzahlung', 'haben', 'zinsen',
  'entrata', 'entrate', 'accredito', 'deposito', 'stipendio', 'salario', 'ricevuto', 'rimborso', 'bonifico da', 'avere',
  'inkomend', 'inkomsten', 'bij', 'credit', 'storting', 'salaris', 'loon', 'ontvangen', 'terugbetaling', 'rente'
];

// Custom page render function to reconstruct spatial layout, column gaps, and column signs
function renderPage(pageData: any): Promise<string> {
  const render_options = {
    normalizeWhitespace: true,
    disableCombineTextItems: false
  };

  return pageData.getTextContent(render_options)
    .then(function(textContent: any) {
      // Group items by Y coordinate (rows, tolerance ~3px)
      const rows = new Map<number, Array<{ x: number; w: number; str: string }>>();
      for (const item of textContent.items) {
        if (!item.str || (!item.str.trim() && item.str !== ' ')) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y)!.push({
          x: item.transform[4],
          w: item.width || 0,
          str: item.str
        });
      }

      // Sort rows from top to bottom (Y descending in PDF coordinate space)
      const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);

      let outflowColX: number | null = null;
      let inflowColX: number | null = null;

      // Scan rows to detect column header X positions
      for (const y of sortedYs) {
        const items = rows.get(y)!.sort((a, b) => a.x - b.x);
        for (const item of items) {
          const strLower = item.str.toLowerCase().trim();
          if (OUTFLOW_HEADER_KEYWORDS.some(kw => strLower.includes(kw)) && outflowColX === null) {
            outflowColX = item.x;
          }
          if (INFLOW_HEADER_KEYWORDS.some(kw => strLower.includes(kw)) && inflowColX === null) {
            inflowColX = item.x;
          }
        }
      }

      let pageText = '';
      for (const y of sortedYs) {
        const rowItems = rows.get(y)!.sort((a, b) => a.x - b.x);
        let lineStr = '';
        let lastX: number | undefined = undefined;

        for (const item of rowItems) {
          if (lastX !== undefined) {
            const gap = item.x - lastX;
            if (gap > 20) {
              lineStr += '   '; // Triple space gap for column separation
            } else if (gap > 3) {
              lineStr += ' ';
            }
          }

          let token = item.str;
          const trimmed = token.trim();

          // Spatial column sign enhancement:
          // If token is a raw positive decimal number (e.g., "12.50", "12,50", "1.250,50", "1 250,50") and falls under Outflow column X
          if (/^[\d.\s]+[.,]\d{2}$/.test(trimmed) || /^\d+([.,]\d{2})?$/.test(trimmed)) {
            if (outflowColX !== null && Math.abs(item.x - outflowColX) < 55) {
              token = token.replace(trimmed, `-${trimmed}`);
            }
          }

          lineStr += token;
          lastX = item.x + item.w;
        }

        pageText += lineStr + '\n';
      }

      return pageText;
    });
}

// Fallback to local python pypdf parser
async function tryPythonParse(buffer: Buffer): Promise<string> {
  const scriptPath = path.join(process.cwd(), "src", "lib", "parse_pdf.py");
  const commands = ["python", "py", "python3"];
  
  for (const cmd of commands) {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const child = spawn(cmd, [scriptPath]);
        let stdoutData = "";
        let stderrData = "";
        
        child.stdout.on("data", (data) => {
          stdoutData += data.toString();
        });
        
        child.stderr.on("data", (data) => {
          stderrData += data.toString();
        });
        
        child.on("error", (err) => {
          reject(err);
        });
        
        child.on("close", (code) => {
          if (code === 0) {
            resolve(stdoutData);
          } else {
            reject(new Error(stderrData || `Exit code ${code}`));
          }
        });
        
        child.stdin.write(buffer);
        child.stdin.end();
      });
      return result;
    } catch (e) {
      console.log(`Failed to parse with command '${cmd}':`, e);
    }
  }
  throw new Error("Python parser not available or failed");
}

export async function POST(request: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Empty file uploaded" }, { status: 400 });
    }

    // Strip Java serialization header if present
    let rawBuffer = buffer;
    if (buffer[0] === 0xac && buffer[1] === 0xed && buffer[2] === 0x00 && buffer[3] === 0x05) {
      rawBuffer = buffer.subarray(27);
    }

    try {
      const options = {
        pagerender: renderPage
      };
      const parsed = await pdfParse(rawBuffer, options);
      return NextResponse.json({ text: parsed.text });
    } catch (pdfParseError: any) {
      console.warn("pdf-parse failed, attempting fallback to python parser:", pdfParseError.message);
      
      try {
        const pythonText = await tryPythonParse(buffer);
        return NextResponse.json({ text: pythonText });
      } catch (pythonError: any) {
        console.error("Python fallback also failed:", pythonError.message);
        return NextResponse.json({ error: pdfParseError.message || "Failed to parse PDF" }, { status: 500 });
      }
    }
  } catch (error: any) {
    console.error("PDF Parsing API error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse PDF" }, { status: 500 });
  }
}
