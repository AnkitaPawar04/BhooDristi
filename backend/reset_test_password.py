#!/usr/bin/env python
"""Reset test user password to properly hashed version"""
import sys
sys.path.insert(0, 'E:\\BhooDristi\\backend')

from app.database.config import SessionLocal
from app.models.farmer import Farmer
from app.utils.auth import hash_password

# Connect to database
db = SessionLocal()

# Find the test user
test_email = "ankita.pawarr19@gmail.com"
farmer = db.query(Farmer).filter(Farmer.email == test_email).first()

if farmer:
    # Set a new password (you can change this)
    new_password = "password123"
    farmer.password_hash = hash_password(new_password)
    db.commit()
    print(f"✓ Password reset for {test_email}")
    print(f"  Username: {test_email}")
    print(f"  Password: {new_password}")
else:
    print(f"✗ User {test_email} not found")

db.close()
