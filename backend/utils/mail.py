import os
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT", "10"))


def send_password_reset_email(to_email: str, reset_link: str):
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = "Reset your Climbge password"

    text = (
        f"Click the link below to reset your Climbge password:\n\n"
        f"{reset_link}\n\n"
        f"This link expires in 1 hour. If you didn't request this, ignore this email."
    )
    html = f"""<html><body style="font-family:sans-serif;color:#1c1917">
<p>Click the link below to reset your <strong>Climbge</strong> password:</p>
<p><a href="{reset_link}" style="color:#F7A62D">{reset_link}</a></p>
<p style="color:#78716c;font-size:13px">
  This link expires in 1 hour.<br>
  If you didn't request a password reset, you can safely ignore this email.
</p>
</body></html>"""

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    ssl_context = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT) as server:
        server.ehlo()
        server.starttls(context=ssl_context)
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
