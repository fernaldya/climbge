import os
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.message import EmailMessage

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT", "10"))
SMTP_FROM = f"Climbge <{SMTP_USER}>"


class MailDeliveryError(Exception):
    """Raised when an email cannot be delivered."""

def send_password_reset_email(
    to_email: str, 
    reset_link: str, 
    subject: str='Reset your Climbge password'
) -> None:  

    if not SMTP_USER or not SMTP_PASS:
        logger.error('SMTP_USER or SMTP_PASS not set')
        raise RuntimeError("SMTP_USER and SMTP_PASS must be set")

    msg = EmailMessage()
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject

    text_body = (
        f"Click the link below to reset your Climbge password:\n\n"
        f"{reset_link}\n\n"
        f"This link expires in 1 hour. If you didn't request this, ignore this email."
    )
    html_body = f"""<html><body style="font-family:sans-serif;color:#1c1917">
<p>Click the link below to reset your <strong>Climbge</strong> password:</p>
<p><a href="{reset_link}" style="color:#F7A62D">{reset_link}</a></p>
<p style="color:#78716c;font-size:13px">
  This link expires in 1 hour.<br>
  If you didn't request a password reset, you can safely ignore this email.
</p>
</body></html>"""

    msg.set_content(text_body or "Please open this email in an HTML-compatible email client.")
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
    except (smtplib.SMTPException, OSError, TimeoutError) as exc:
        logger.error(f'Failed to send email to reset password with error: {exc}')
        raise MailDeliveryError("password reset email delivery failed") from exc