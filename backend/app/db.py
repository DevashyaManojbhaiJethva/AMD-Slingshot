from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.server_api import ServerApi

from .config import settings


mongo_client = AsyncIOMotorClient(settings.mongo_uri, server_api=ServerApi("1"))
database: AsyncIOMotorDatabase = mongo_client[settings.mongo_db_name]


def get_database() -> AsyncIOMotorDatabase:
    return database


async def ping_database() -> None:
    await mongo_client.admin.command("ping")
