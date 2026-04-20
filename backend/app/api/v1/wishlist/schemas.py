from pydantic import BaseModel


class WishlistAddRequest(BaseModel):
    product_id: int


class WishlistMessage(BaseModel):
    message: str
