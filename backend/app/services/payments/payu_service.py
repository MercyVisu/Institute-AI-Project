import hashlib
from app.core.config import get_settings
from app.models.subscription import Payment
from sqlalchemy.orm import Session
from uuid import UUID
import structlog

settings = get_settings()
logger = structlog.get_logger()

PAYU_BASE_URL = "https://secure.payu.in/_payment"
PAYU_TEST_URL = "https://test.payu.in/_payment"


def generate_payu_hash(txnid: str, amount: float, productinfo: str, firstname: str, email: str) -> str:
    """Generate PayU hash for payment verification."""
    hash_string = (
        f"{settings.PAYU_MERCHANT_KEY}|{txnid}|{amount}|{productinfo}"
        f"|{firstname}|{email}|||||||||||{settings.PAYU_SALT}"
    )
    return hashlib.sha512(hash_string.encode("utf-8")).hexdigest().lower()


def verify_payu_response(params: dict) -> bool:
    """Verify PayU payment response hash."""
    received_hash = params.get("hash", "")
    status = params.get("status", "")
    txnid = params.get("txnid", "")
    amount = params.get("amount", "")
    productinfo = params.get("productinfo", "")
    firstname = params.get("firstname", "")
    email = params.get("email", "")

    hash_string = (
        f"{settings.PAYU_SALT}|{status}|||||||||||"
        f"|{email}|{firstname}|{productinfo}|{amount}|{txnid}|{settings.PAYU_MERCHANT_KEY}"
    )
    generated_hash = hashlib.sha512(hash_string.encode("utf-8")).hexdigest().lower()
    return generated_hash == received_hash


def create_payment_record(
    db: Session,
    tenant_id: UUID,
    amount: float,
    subscription_id: UUID = None,
) -> Payment:
    """Create a payment record."""
    payment = Payment(
        tenant_id=tenant_id,
        amount=amount,
        subscription_id=subscription_id,
        status="pending",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def get_payu_payment_url() -> str:
    """Get PayU payment URL based on environment."""
    if settings.APP_ENV == "production":
        return PAYU_BASE_URL
    return PAYU_TEST_URL
