"""
Admin product management routes
"""
import csv
import io
from typing import List, Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.db import get_session
from app.api.v1.auth.dependencies import require_admin_permission
from app.models import User, Product, ProductVariant
from app.api.v1.admin.schemas import ProductManagementRead, StockAlertItem
from app.api.v1.admin.services import (
    create_product_admin,
    update_product_admin,
    delete_product_admin,
    upload_product_image,
    get_all_products_admin,
    get_entity_or_404,
)
from app.core.sanitization import sanitize_multiline_text, sanitize_plain_text, sanitize_slug
from app.core.newsletter_tasks import run_product_newsletter_job

router = APIRouter()


CSV_EXPECTED_FIELDS = [
    "name",
    "slug",
    "description",
    "price",
    "category",
    "sku",
    "in_stock",
    "is_active",
    "image_url",
]


class BulkImportRowResult(BaseModel):
    row_index: int
    slug: Optional[str] = None
    action: Literal["create", "update", "skip", "error"]
    message: Optional[str] = None
    product_id: Optional[int] = None


class BulkImportResult(BaseModel):
    mode: Literal["dry_run", "commit"]
    total_rows: int
    created: int = 0
    updated: int = 0
    skipped: int = 0
    errors: int = 0
    results: List[BulkImportRowResult] = Field(default_factory=list)


def _coerce_bool(raw: object, default: bool = True) -> bool:
    if raw is None:
        return default
    if isinstance(raw, bool):
        return raw
    s = str(raw).strip().lower()
    if s in {"1", "true", "yes", "y", "t", "on"}:
        return True
    if s in {"0", "false", "no", "n", "f", "off", ""}:
        return False
    return default


def _parse_price(raw: object) -> float:
    if raw is None or str(raw).strip() == "":
        raise ValueError("Price is required")
    try:
        value = float(str(raw).replace(",", "").strip())
    except ValueError:
        raise ValueError(f"Invalid price: {raw!r}")
    if value <= 0:
        raise ValueError("Price must be greater than zero")
    return value


def _parse_int(raw: object, *, minimum: int = 0) -> int:
    if raw is None or str(raw).strip() == "":
        return minimum
    try:
        value = int(float(str(raw).strip()))
    except ValueError:
        raise ValueError(f"Invalid integer: {raw!r}")
    if value < minimum:
        raise ValueError(f"Value {value} below minimum {minimum}")
    return value


def _normalize_row(row: dict) -> dict:
    """Validate + sanitize a CSV row into a product-payload dict."""
    name = sanitize_plain_text(row.get("name"), max_length=300, single_line=True)
    if not name:
        raise ValueError("Missing 'name'")

    slug_raw = row.get("slug") or name
    slug = sanitize_slug(str(slug_raw))
    if not slug:
        raise ValueError("Missing/invalid 'slug'")

    price = _parse_price(row.get("price"))
    in_stock = _parse_int(row.get("in_stock"), minimum=0)
    is_active = _coerce_bool(row.get("is_active"), default=True)

    description = sanitize_multiline_text(row.get("description"), max_length=20000)
    category = sanitize_plain_text(row.get("category"), max_length=64, single_line=True)
    sku = sanitize_plain_text(row.get("sku"), max_length=120, single_line=True)
    image_url = sanitize_plain_text(row.get("image_url"), max_length=1024, single_line=True)

    return {
        "name": name,
        "slug": slug,
        "description": description,
        "price": price,
        "in_stock": in_stock,
        "is_active": is_active,
        "category": category,
        "sku": sku,
        "image_url": image_url,
    }


@router.get("/", response_model=List[ProductManagementRead])
async def list_products_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: str = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    """List all products for admin management."""
    return await get_all_products_admin(
        session,
        skip=skip,
        limit=limit,
        category=category,
    )


@router.post("/", response_model=ProductManagementRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    slug: str = Form(...),
    description: str = Form(None),
    price: float = Form(..., gt=0),
    category: str = Form(None),
    in_stock: int = Form(0, ge=0),
    image: UploadFile = File(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    """Create a new product with optional image upload."""
    image_url = None
    if image:
        image_url = await upload_product_image(image, session)
    
    name_clean = sanitize_plain_text(name, max_length=300, single_line=True)
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product name is required",
        )
    product_data = {
        "name": name_clean,
        "slug": sanitize_slug(slug),
        "description": sanitize_multiline_text(description, max_length=20000),
        "price": price,
        "category": sanitize_plain_text(category, max_length=64, single_line=True) if category else None,
        "in_stock": in_stock,
        "image_url": image_url,
        "is_active": True,
    }
    
    created = await create_product_admin(session, product_data)
    background_tasks.add_task(
        run_product_newsletter_job,
        created.id,
        "new_product",
        None,
    )
    return created


@router.get("/{product_id}", response_model=ProductManagementRead)
async def get_product_admin(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    """Single product for admin edit forms."""
    p = await get_entity_or_404(session, Product, product_id)
    return ProductManagementRead.model_validate(p)


@router.put("/{product_id}", response_model=ProductManagementRead)
async def update_product(
    background_tasks: BackgroundTasks,
    product_id: int,
    name: str = Form(None),
    slug: str = Form(None),
    description: str = Form(None),
    price: float = Form(None),
    category: str = Form(None),
    in_stock: int = Form(None),
    is_active: bool = Form(None),
    image: UploadFile = File(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    """Update a product."""
    existing = await get_entity_or_404(session, Product, product_id)
    prev_price = float(existing.price)

    image_url = None
    if image:
        image_url = await upload_product_image(image, session)
    
    product_data = {}
    if name is not None:
        product_data["name"] = sanitize_plain_text(name, max_length=300, single_line=True)
    if slug is not None:
        product_data["slug"] = sanitize_slug(slug)
    if description is not None:
        product_data["description"] = sanitize_multiline_text(description, max_length=20000)
    if price is not None:
        product_data["price"] = price
    if category is not None:
        product_data["category"] = sanitize_plain_text(category, max_length=64, single_line=True)
    if in_stock is not None:
        product_data["in_stock"] = in_stock
    if image_url is not None:
        product_data["image_url"] = image_url
    if is_active is not None:
        product_data["is_active"] = is_active
    
    updated = await update_product_admin(session, product_id, product_data)
    if price is not None and float(updated.price) < prev_price:
        background_tasks.add_task(
            run_product_newsletter_job,
            product_id,
            "price_drop",
            prev_price,
        )
    return updated


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    """Delete a product."""
    await delete_product_admin(session, product_id)


@router.get("/low-stock/list", response_model=List[ProductManagementRead])
async def list_low_stock_products(
    threshold: int = Query(5, ge=0, le=10_000),
    limit: int = Query(100, ge=1, le=500),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_inventory")),
):
    """
    Products at or below `threshold` stock. Default threshold is 5.
    Useful for admin "stock alerts" dashboards and back-in-stock emails.
    """
    stmt = (
        select(Product)
        .where(Product.is_active == True, Product.in_stock <= threshold)
        .order_by(Product.in_stock.asc(), Product.name.asc())
        .limit(limit)
    )
    rows = list(session.exec(stmt).all())
    return [ProductManagementRead.model_validate(p) for p in rows]


@router.get("/low-stock/alerts", response_model=List[StockAlertItem])
async def list_low_stock_alerts(
    threshold: int = Query(5, ge=0, le=10_000),
    limit: int = Query(100, ge=1, le=500),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_inventory")),
):
    """Products and active variants at or below `threshold` (merged, sorted by stock)."""
    prods = list(
        session.exec(
            select(Product)
            .where(Product.is_active == True, Product.in_stock <= threshold)
            .order_by(Product.in_stock.asc(), Product.name.asc())
            .limit(limit)
        ).all()
    )
    pairs = list(
        session.exec(
            select(ProductVariant, Product)
            .join(Product, ProductVariant.product_id == Product.id)
            .where(
                Product.is_active == True,
                ProductVariant.is_active == True,
                ProductVariant.in_stock <= threshold,
            )
            .order_by(
                ProductVariant.in_stock.asc(),
                Product.name.asc(),
                ProductVariant.name.asc(),
            )
            .limit(limit)
        ).all()
    )
    out: list[StockAlertItem] = []
    for p in prods:
        if p.id is None:
            continue
        out.append(
            StockAlertItem(
                kind="product",
                product_id=p.id,
                variant_id=None,
                name=p.name,
                parent_product_name=None,
                sku=p.sku,
                in_stock=int(p.in_stock),
                unit_price=float(p.price),
            )
        )
    for v, p in pairs:
        if v.id is None or p.id is None:
            continue
        out.append(
            StockAlertItem(
                kind="variant",
                product_id=p.id,
                variant_id=v.id,
                name=v.name,
                parent_product_name=p.name,
                sku=v.sku or p.sku,
                in_stock=int(v.in_stock),
                unit_price=float(p.price) + float(v.price_delta),
            )
        )
    out.sort(key=lambda r: (r.in_stock, r.name.lower()))
    return out[:limit]


@router.post(
    "/bulk-import",
    response_model=BulkImportResult,
    status_code=status.HTTP_200_OK,
)
async def bulk_import_products(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="CSV file with product rows"),
    commit: bool = Form(False, description="If false, run a dry-run and report changes without persisting"),
    update_existing: bool = Form(True, description="If true, update products that match by slug; otherwise skip them"),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_products")),
):
    """
    Bulk-create/update products from CSV. Expected columns (header row):
    `name,slug,description,price,category,sku,in_stock,is_active,image_url`
    Rows are matched to existing products by `slug`.
    """
    if file.content_type and "csv" not in file.content_type.lower() and not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Empty CSV"
        )

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV missing header row",
        )

    unknown = [h for h in reader.fieldnames if h and h.strip().lower() not in CSV_EXPECTED_FIELDS]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unexpected CSV columns: {', '.join(unknown)}. Expected: {', '.join(CSV_EXPECTED_FIELDS)}",
        )

    mode: Literal["dry_run", "commit"] = "commit" if commit else "dry_run"
    created = updated = skipped = errors = 0
    results: List[BulkImportRowResult] = []

    for idx, raw_row in enumerate(reader, start=2):  # account for header row
        row = {k.strip().lower(): v for k, v in (raw_row or {}).items() if k}
        try:
            payload = _normalize_row(row)
        except ValueError as exc:
            errors += 1
            results.append(
                BulkImportRowResult(
                    row_index=idx,
                    slug=None,
                    action="error",
                    message=str(exc),
                )
            )
            continue

        existing = session.exec(
            select(Product).where(Product.slug == payload["slug"])
        ).first()

        if existing is not None:
            if not update_existing:
                skipped += 1
                results.append(
                    BulkImportRowResult(
                        row_index=idx,
                        slug=payload["slug"],
                        action="skip",
                        product_id=existing.id,
                        message="Exists; update_existing=false",
                    )
                )
                continue

            if commit:
                try:
                    prev_price = float(existing.price)
                    updated_product = await update_product_admin(session, existing.id, payload)
                    if float(updated_product.price) < prev_price:
                        background_tasks.add_task(
                            run_product_newsletter_job,
                            existing.id,
                            "price_drop",
                            prev_price,
                        )
                    updated += 1
                    results.append(
                        BulkImportRowResult(
                            row_index=idx,
                            slug=payload["slug"],
                            action="update",
                            product_id=existing.id,
                        )
                    )
                except Exception as exc:  # pragma: no cover
                    errors += 1
                    results.append(
                        BulkImportRowResult(
                            row_index=idx,
                            slug=payload["slug"],
                            action="error",
                            product_id=existing.id,
                            message=str(exc),
                        )
                    )
            else:
                updated += 1
                results.append(
                    BulkImportRowResult(
                        row_index=idx,
                        slug=payload["slug"],
                        action="update",
                        product_id=existing.id,
                        message="Would update",
                    )
                )
        else:
            if commit:
                try:
                    created_product = await create_product_admin(session, payload)
                    background_tasks.add_task(
                        run_product_newsletter_job,
                        created_product.id,
                        "new_product",
                        None,
                    )
                    created += 1
                    results.append(
                        BulkImportRowResult(
                            row_index=idx,
                            slug=payload["slug"],
                            action="create",
                            product_id=created_product.id,
                        )
                    )
                except HTTPException as exc:
                    errors += 1
                    results.append(
                        BulkImportRowResult(
                            row_index=idx,
                            slug=payload["slug"],
                            action="error",
                            message=str(exc.detail),
                        )
                    )
                except Exception as exc:  # pragma: no cover
                    errors += 1
                    results.append(
                        BulkImportRowResult(
                            row_index=idx,
                            slug=payload["slug"],
                            action="error",
                            message=str(exc),
                        )
                    )
            else:
                created += 1
                results.append(
                    BulkImportRowResult(
                        row_index=idx,
                        slug=payload["slug"],
                        action="create",
                        message="Would create",
                    )
                )

    return BulkImportResult(
        mode=mode,
        total_rows=len(results),
        created=created,
        updated=updated,
        skipped=skipped,
        errors=errors,
        results=results,
    )
