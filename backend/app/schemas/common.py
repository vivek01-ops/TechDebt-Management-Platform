from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, Any

T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
    limit: int = 100
    offset: int = 0


class Message(BaseModel):
    message: str
    details: Optional[dict[str, Any]] = None
