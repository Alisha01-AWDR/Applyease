import subprocess
import sys

print("Downgrading database to Alembic base...")
subprocess.run([sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "downgrade", "base"], check=True)
print("Applying latest Alembic schema...")
subprocess.run([sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head"], check=True)
print("ApplyEase database reset. Run: python backend/scripts/seed.py")
