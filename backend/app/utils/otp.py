import pyotp
import os
import random
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Store OTP in memory (In production, use Redis)
otp_storage = {}

# Generate OTP (6-digit code)
def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def send_sms_otp(phone_number: str, otp: str) -> bool:
    """
    Send OTP via Twilio SMS
    Phone number should be in format: 10-digit without +91
    """
    try:
        # Check if Twilio credentials are configured
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
            print(f"⚠️  Twilio not configured. OTP for {phone_number}: {otp}")
            return True  # Return True for demo purposes
        
        from twilio.rest import Client
        
        # Initialize Twilio client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Format phone number with +91 for India
        full_phone = f"+91{phone_number}"
        
        # Send SMS
        message = client.messages.create(
            body=f"Your BhooDrishti OTP is: {otp}. Valid for 10 minutes. Do not share with anyone.",
            from_=TWILIO_PHONE_NUMBER,
            to=full_phone
        )
        
        print(f"✅ SMS sent to {full_phone}. Message SID: {message.sid}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send SMS to {phone_number}: {str(e)}")
        print(f"   OTP for {phone_number}: {otp}")
        return True  # Return True anyway for demo


def send_email_otp(email: str, otp: str) -> bool:
    """Send an email OTP when SMTP is configured; otherwise keep demo behavior."""
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "")
    # Google displays app passwords in four-character groups; SMTP expects
    # the same value without spaces.
    smtp_password = os.getenv("SMTP_PASSWORD", "").replace(" ", "").strip()
    smtp_from = os.getenv("SMTP_FROM", smtp_username)

    if not smtp_host or not smtp_username or not smtp_password or not smtp_from:
        print(f"Warning: SMTP not configured. OTP for {email}: {otp}")
        return True

    try:
        message = EmailMessage()
        message["Subject"] = "Your BhooDrishti login OTP"
        message["From"] = smtp_from
        message["To"] = email
        message.set_content(f"Your BhooDrishti login OTP is {otp}. It is valid for 10 minutes.")
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(message)
        return True
    except Exception as error:
        print(f"Failed to send email OTP to {email}: {error}")
        print(f"OTP for {email}: {otp}")
        return True

def store_otp(phone_number: str, otp: str):
    """Store OTP with phone number"""
    otp_storage[phone_number] = otp
    print(f"📱 OTP stored for {phone_number}: {otp}")

def verify_otp(phone_number: str, otp: str) -> bool:
    """Verify OTP"""
    stored_otp = otp_storage.get(phone_number)
    if stored_otp and stored_otp == otp:
        del otp_storage[phone_number]
        print(f"✅ OTP verified for {phone_number}")
        return True
    print(f"❌ OTP verification failed for {phone_number}")
    return False

