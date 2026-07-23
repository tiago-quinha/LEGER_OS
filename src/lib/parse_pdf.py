import sys
import pypdf
import io

def main():
    try:
        # Read raw bytes from stdin
        pdf_bytes = sys.stdin.buffer.read()
        if not pdf_bytes:
            print("ERROR: No input bytes", file=sys.stderr)
            sys.exit(1)
            
        # Strip Java serialization header if present
        if pdf_bytes.startswith(b'\xac\xed\x00\x05'):
            pdf_bytes = pdf_bytes[27:]
            
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
            
        # Write extracted text to stdout
        sys.stdout.write(text)
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
