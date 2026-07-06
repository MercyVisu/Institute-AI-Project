import app.main  # ensure models are imported
from app.core.database import SessionLocal
from app.core.security import verify_password
from app.models.user import User

EMAIL = 'mugilansakthivel70@gmail.com'

def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).first()
        if not user:
            print(f'User {EMAIL} not found')
            return
        
        print(f"Email: {user.email}")
        print(f"Is Active: {user.is_active}")
        print(f"Role: {user.role}")
        print(f"Hashed Password: {user.hashed_password[:20]}...")
        
        # Test password verification
        test_password = 'macha@123'
        is_valid = verify_password(test_password, user.hashed_password)
        print(f"Password 'macha@123' is valid: {is_valid}")
        
    finally:
        db.close()

if __name__ == '__main__':
    main()
