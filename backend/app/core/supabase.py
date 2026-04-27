"""
Supabase storage helper.
"""
import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
# Storage bucket name - should be a simple name like "product-images", not a full URL
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET_NAME", "product-images")

_supabase_client: Client | None = None


def get_supabase_client() -> Client | None:
    """Get or create Supabase client."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.warning("Supabase credentials not configured")
        return None

    try:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Ensure bucket exists
        try:
            _ensure_bucket_exists(_supabase_client)
        except Exception as e:
            logger.warning(f"Could not ensure bucket exists: {e}")
        
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        return None


def _ensure_bucket_exists(client: Client) -> None:
    """Create storage bucket if it doesn't exist."""
    try:
        # Try to get bucket info
        client.storage.get_bucket(SUPABASE_STORAGE_BUCKET)
        logger.info(f"Supabase storage bucket '{SUPABASE_STORAGE_BUCKET}' exists")
    except Exception as e:
        # Bucket doesn't exist, try to create it
        if "not found" in str(e).lower():
            try:
                client.storage.create_bucket(
                    SUPABASE_STORAGE_BUCKET,
                    {
                        "public": True,
                        "allowed_mime_types": [
                            "image/jpeg",
                            "image/png",
                            "image/webp",
                            "image/gif",
                            "image/svg+xml",
                        ],
                    },
                )
                logger.info(f"Created Supabase storage bucket: {SUPABASE_STORAGE_BUCKET}")
            except Exception as create_error:
                logger.error(f"Could not create bucket {SUPABASE_STORAGE_BUCKET}: {create_error}")
                raise
        else:
            raise


def get_public_url(path: str) -> str | None:
    """Get public URL for an uploaded file."""
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not available")
        return None

    try:
        response = client.storage.from_(SUPABASE_STORAGE_BUCKET).get_public_url(path)
        if isinstance(response, str) and response:
            return response
        if isinstance(response, dict) and response.get("public_url"):
            return response["public_url"]
    except Exception as e:
        logger.error(f"Error getting public URL for {path}: {e}")
    
    return None


def upload_file(file_path: str, file_data: bytes) -> str | None:
    """Upload a file to Supabase storage and return the public URL."""
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not available for upload")
        return None

    try:
        client.storage.from_(SUPABASE_STORAGE_BUCKET).upload(
            path=file_path,
            file=file_data,
            file_options={"content-type": "application/octet-stream"},
        )
        logger.info(f"Uploaded file to Supabase: {file_path}")
        return get_public_url(file_path)
    except Exception as e:
        logger.error(f"Error uploading file {file_path}: {e}")
        return None


def delete_file(file_path: str) -> bool:
    """Delete a file from Supabase storage."""
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not available for deletion")
        return False

    try:
        client.storage.from_(SUPABASE_STORAGE_BUCKET).remove([file_path])
        logger.info(f"Deleted file from Supabase: {file_path}")
        return True
    except Exception as e:
        logger.error(f"Error deleting file {file_path}: {e}")
        return False