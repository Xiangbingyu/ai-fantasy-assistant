import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    ZHIPU_API_KEY = os.getenv("ZHIPU_API_KEY", "e0701163e15846d68e6d79646b0de9eb.LSJg3nW63REUlTPK")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:123456@localhost:5432/ai-assistant"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False