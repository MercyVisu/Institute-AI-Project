import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import get_settings
import structlog

settings = get_settings()
logger = structlog.get_logger()


def send_email(to: str, subject: str, body: str, html: bool = True) -> bool:
    """Send email via SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.APP_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to

        content_type = "html" if html else "plain"
        msg.attach(MIMEText(body, content_type))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("email_sent", to=to, subject=subject)
        return True
    except Exception as e:
        logger.error("email_send_failed", to=to, error=str(e))
        return False


def send_welcome_email(to: str, name: str, password: str) -> bool:
    """Send welcome email to new user."""
    body = f"""
    <html>
    <body style="font-family: Inter, sans-serif; padding: 20px;">
        <h2 style="color: #7C3AED;">Welcome to {settings.APP_NAME}!</h2>
        <p>Hello {name},</p>
        <p>Your account has been created successfully.</p>
        <p><strong>Login URL:</strong> {settings.FRONTEND_URL}/login</p>
        <p><strong>Email:</strong> {to}</p>
        <p><strong>Temporary Password:</strong> {password}</p>
        <p>Please change your password after first login.</p>
        <br>
        <p>Best regards,<br>{settings.APP_NAME} Team</p>
    </body>
    </html>
    """
    return send_email(to, f"Welcome to {settings.APP_NAME}", body)


def send_ticket_notification(to: str, ticket_number: str, subject: str) -> bool:
    """Send ticket creation notification."""
    body = f"""
    <html>
    <body style="font-family: Inter, sans-serif; padding: 20px;">
        <h2 style="color: #7C3AED;">New Support Ticket</h2>
        <p>A new support ticket has been created.</p>
        <p><strong>Ticket Number:</strong> {ticket_number}</p>
        <p><strong>Subject:</strong> {subject}</p>
        <br>
        <p>Best regards,<br>{settings.APP_NAME} Team</p>
    </body>
    </html>
    """
    return send_email(to, f"New Ticket: {ticket_number}", body)
