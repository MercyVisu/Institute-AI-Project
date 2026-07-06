import os
import sys
import traceback

sys.path.append(os.path.dirname(__file__))

import app.main  # ensure models are imported and registered
from app.core.database import SessionLocal
from app.schemas.schemas import LoginRequest
from app.services.auth.auth_service import authenticate_user


def main():
    db = SessionLocal()
    login = LoginRequest(email='admin@eduai.com', password='admin123456')
    try:
        token = authenticate_user(db, login)
        print("Success:", token)
    except Exception as e:
        print("Exception type:", type(e))
        traceback.print_exc()
    finally:
        db.close()


if __name__ == '__main__':
    main()
