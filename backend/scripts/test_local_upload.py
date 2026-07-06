import sys
from pathlib import Path
sys.path.append(r'd:\\Edu_AI\\backend')

from app.services.storage.s3_service import upload_to_s3
import asyncio

async def run():
    content = b'Hello test upload via script'
    url, size = await upload_to_s3(content, folder='test_uploads', filename='script_test.pdf')
    print('url:', url)
    print('size:', size)
    if '/uploads/' in url:
        key = url.split('/uploads/')[-1]
        uploads_base = Path(r'd:\\Edu_AI\\backend') / 'uploads'
        p = uploads_base / key
        print('local path:', p)
        print('exists:', p.exists())
        if p.exists():
            print('on-disk size:', p.stat().st_size)

if __name__ == '__main__':
    asyncio.run(run())
