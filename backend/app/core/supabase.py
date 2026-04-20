from typing import Optional

from supabase import Client, create_client

from app.core.config import settings


def get_supabase_admin_client() -> Optional[Client]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
