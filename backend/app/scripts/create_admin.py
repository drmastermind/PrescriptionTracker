# ------------------------------------------------------------
# Script: create_admin.py
# Purpose: CLI to bootstrap the first admin user
# Author: David Scott
# Created: 2026-04-23
# ------------------------------------------------------------
import argparse
import sys

sys.path.insert(0, ".")

from app.core.security import hash_password
from app.db.session import SessionLocal
import app.models  # ensure all models are registered
from app.models.user import User


def main():
    parser = argparse.ArgumentParser(description="Create an admin user")
    parser.add_argument("--login", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default=None)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if db.query(User).filter(User.login_name == args.login).first():
            print(f"User '{args.login}' already exists.")
            sys.exit(1)
        user = User(
            login_name=args.login,
            user_name=args.name or args.login,
            email=args.email,
            password_hash=hash_password(args.password),
            role="admin",
        )
        db.add(user)
        db.commit()
        print(f"Admin user '{args.login}' created (user_id={user.user_id}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
