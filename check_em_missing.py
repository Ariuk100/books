import fitz
import re

tex_path = "/Users/ariunboldganbold/Desktop/books/tex/электромагнетизм.tex"
pdf_path = "/Users/ariunboldganbold/Desktop/books/orginal/Иродов. т3 Электромагнетизм. Основные законы_2014, 9-е изд, 319с.pdf"

with open(tex_path, "r", encoding="utf-8") as f:
    tex_content = f.read()

def sanitize(t):
    # remove basic math patterns and latex commands
    t = re.sub(r'\$.*?\$', '', t)
    t = re.sub(r'\\\[.*?\\\]', '', t, flags=re.DOTALL)
    t = re.sub(r'\\[a-zA-Z]+', '', t)
    t = re.sub(r'[\{\}\[\]\(\)\\.,;:\-—"«»\n\r]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t.lower()

tex_clean = sanitize(tex_content)
doc = fitz.open(pdf_path)

missing_candidates = []

# Assuming main content starts around page 9 (Introduction / Chapter 1)
for page_num in range(8, doc.page_count - 5):
    page = doc.load_page(page_num)
    blocks = page.get_text("blocks")
    for b in blocks:
        text = b[4]
        # Skip small blocks (equations, page numbers, short headers)
        if len(text.strip()) < 80:
            continue
            
        clean_text = sanitize(text)
        words = clean_text.split()
        
        # We need a reasonable chunk of words to search
        if len(words) < 15:
            continue
            
        # Try finding a sequence of 8 words in the TeX
        found = False
        for i in range(len(words) - 8):
            chunk = " ".join(words[i:i+8])
            if chunk in tex_clean:
                found = True
                break
                
        if not found:
            missing_candidates.append((page_num + 1, text.strip()))

output_path = "/Users/ariunboldganbold/Desktop/books/missing_em_candidates.txt"
with open(output_path, "w", encoding="utf-8") as f:
    for p, t in missing_candidates:
        f.write(f"--- Page {p} ---\n{t}\n\n")

print(f"Done. Found {len(missing_candidates)} potential missing blocks. Written to {output_path}")
