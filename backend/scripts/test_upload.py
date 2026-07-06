import sys
sys.path.insert(0, "d:/Edu_AI/backend")
import requests, io

# Login
r = requests.post("http://localhost:8000/api/v1/auth/login",
    json={"email": "mugilansakthivel70@gmail.com", "password": "client123456"})
print("Login:", r.status_code)
if r.status_code != 200:
    print(r.text)
    sys.exit(1)
token = r.json()["access_token"]

# Test 1: TXT file (should always work)
r2 = requests.post(
    "http://localhost:8000/api/v1/training/upload",
    headers={"Authorization": f"Bearer {token}"},
    files={"file": ("test.txt", io.BytesIO(b"School fees are 5000 per term. Admission opens in June."), "text/plain")},
    params={"title": "TXT Test"},
)
resp = r2.json()
print(f"TXT -> HTTP {r2.status_code} | status={resp.get('status')} | chunks={resp.get('chunk_count')} | error={resp.get('error_message')}")

# Test 2: Minimal PDF with actual text stream
pdf_with_text = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
    b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    b"4 0 obj<</Length 44>>\nstream\nBT /F1 12 Tf 100 700 Td (Hello School) Tj ET\nendstream\nendobj\n"
    b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"xref\n0 6\n"
    b"0000000000 65535 f\r\n"
    b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n9\n%%EOF"
)
r3 = requests.post(
    "http://localhost:8000/api/v1/training/upload",
    headers={"Authorization": f"Bearer {token}"},
    files={"file": ("test.pdf", io.BytesIO(pdf_with_text), "application/pdf")},
    params={"title": "PDF Test"},
)
resp3 = r3.json()
print(f"PDF -> HTTP {r3.status_code} | status={resp3.get('status')} | chunks={resp3.get('chunk_count')} | error={resp3.get('error_message')}")

# Check what the server version of training.py is doing
print("\nDone.")
