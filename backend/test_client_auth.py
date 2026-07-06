import app.main
from app.core.database import SessionLocal
from app.schemas.schemas import LoginRequest
from app.services.auth.auth_service import authenticate_user


def main():
    db = SessionLocal()
    login = LoginRequest(email='mugilansakthivel70@gmail.com', password='client123456')
    try:
        token = authenticate_user(db, login)
        print('Success login for client:', token.user.email)
    except Exception as e:
        print('Error:', e)
    finally:
        db.close()

if __name__ == '__main__':
    main()
