import { NextResponse } from "next/server";
// @ts-ignore
import pdfParse from "pdf-parse";
import { spawn } from "child_process";
import path from "path";

// Custom page render function to reconstruct spacing and line breaks
function renderPage(pageData: any): Promise<string> {
  const render_options = {
    normalizeWhitespace: true,
    disableCombineTextItems: false
  };

  return pageData.getTextContent(render_options)
    .then(function(textContent: any) {
      let lastY: number | undefined, lastX: number | undefined, text = '';
      for (const item of textContent.items) {
        if (!item.str.trim() && item.str !== ' ') continue;
        
        const currentY = item.transform[5];
        const currentX = item.transform[4];
        
        if (lastY !== undefined && Math.abs(currentY - lastY) > 3) {
          // New line
          text += '\n';
        } else if (lastX !== undefined && currentX - lastX > 3) {
          // Add space on the same line if there is a gap
          text += ' ';
        }
        
        text += item.str;
        lastY = currentY;
        lastX = currentX + item.width;
      }
      return text;
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
