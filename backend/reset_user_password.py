import app.main  # ensure models are imported
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User

EMAIL = 'mugilansakthivel70@gmail.com'
NEW_PASSWORD = 'macha@123'


def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).first()
        if not user:
            print(f'User {EMAIL} not found')
            return
        user.hashed_password = hash_password(NEW_PASSWORD)
        db.commit()
        print(f"Password for {EMAIL} reset to: {NEW_PASSWORD}")
    finally:
        db.close()


if __name__ == '__main__':
    main()
