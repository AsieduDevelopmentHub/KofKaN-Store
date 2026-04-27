"""
Generic CRUD helpers to reduce code duplication in admin services.
Consolidates common patterns for slug-based entity management.
"""
from typing import Optional, Type, TypeVar, List, Callable, Any
from datetime import datetime
from fastapi import HTTPException, status
from sqlmodel import Session, select, SQLModel

T = TypeVar("T", bound=SQLModel)


async def check_slug_unique(
    session: Session,
    model_cls: Type[T],
    slug: str,
    exclude_id: Optional[int] = None,
) -> bool:
    """Check if a slug is unique for a given model."""
    query = select(model_cls).where(model_cls.slug == slug)
    
    if exclude_id is not None:
        query = query.where(model_cls.id != exclude_id)
    
    existing = session.exec(query).first()
    return existing is None


async def get_entity_or_404(
    session: Session,
    model_cls: Type[T],
    entity_id: int,
) -> T:
    """Fetch an entity or raise 404."""
    entity = session.exec(
        select(model_cls).where(model_cls.id == entity_id)
    ).first()
    
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{model_cls.__name__} not found",
        )
    
    return entity


async def create_entity_with_slug(
    session: Session,
    model_cls: Type[T],
    data: dict,
) -> T:
    """Create entity with unique slug validation."""
    is_unique = await check_slug_unique(session, model_cls, data["slug"])
    
    if not is_unique:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{model_cls.__name__} slug already exists",
        )
    
    entity = model_cls(**data)
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


async def update_entity_generic(
    session: Session,
    model_cls: Type[T],
    entity_id: int,
    data: dict,
    has_slug: bool = True,
) -> T:
    """Update entity with optional slug uniqueness validation."""
    entity = await get_entity_or_404(session, model_cls, entity_id)
    
    # Validate slug uniqueness if applicable
    if has_slug and "slug" in data and data["slug"] != entity.slug:
        is_unique = await check_slug_unique(
            session, model_cls, data["slug"], exclude_id=entity_id
        )
        
        if not is_unique:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{model_cls.__name__} slug already exists",
            )
    
    # Update fields
    for key, value in data.items():
        if value is not None:
            setattr(entity, key, value)
    
    # Set updated_at if the model has it
    if hasattr(entity, "updated_at"):
        entity.updated_at = datetime.utcnow()
    
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


async def delete_entity_safe(
    session: Session,
    model_cls: Type[T],
    entity_id: int,
) -> None:
    """Delete entity safely with 404 handling."""
    entity = await get_entity_or_404(session, model_cls, entity_id)
    session.delete(entity)
    session.commit()


async def get_entities_paginated(
    session: Session,
    model_cls: Type[T],
    skip: int = 0,
    limit: int = 50,
    filters: Optional[dict] = None,
    order_by_field: Optional[str] = None,
    order_ascending: bool = False,
) -> List[T]:
    """Get entities with generic pagination and filtering."""
    query = select(model_cls)
    
    # Apply filters
    if filters:
        for field_name, value in filters.items():
            if value is not None and hasattr(model_cls, field_name):
                field = getattr(model_cls, field_name)
                query = query.where(field == value)
    
    # Apply ordering
    if order_by_field and hasattr(model_cls, order_by_field):
        field = getattr(model_cls, order_by_field)
        if order_ascending:
            query = query.order_by(field)
        else:
            query = query.order_by(field.desc())
    
    entities = session.exec(
        query.offset(skip).limit(limit)
    ).all()
    
    return entities


async def toggle_user_field(
    session: Session,
    user_model: Type[T],
    user_id: int,
    field_name: str,
    new_value: Any,
    validation_fn: Optional[Callable[[T], None]] = None,
    on_change_callback: Optional[Callable[[T], Any]] = None,
) -> T:
    """
    Generic user field toggle/update with optional validation and callbacks.
    
    Args:
        session: Database session
        user_model: User model class
        user_id: User ID to update
        field_name: Field name to toggle (e.g., 'is_active', 'is_admin')
        new_value: New value for the field
        validation_fn: Optional validation function that receives the user
        on_change_callback: Optional callback after field is changed (e.g., send email)
    
    Returns:
        Updated user entity
    """
    user = await get_entity_or_404(session, user_model, user_id)
    
    # Apply custom validation if provided
    if validation_fn:
        validation_fn(user)
    
    # Update field
    setattr(user, field_name, new_value)
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Execute callback if provided (e.g., send email)
    if on_change_callback:
        try:
            await on_change_callback(user)
        except Exception as e:
            print(f"Error in on_change_callback: {e}")
    
    return user
