"""
Invoice generation using ReportLab — KofKaN Store branded PDFs with line items,
product names, SKUs, and thumbnails when images can be resolved.
"""
from __future__ import annotations

import io
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from xml.sax.saxutils import escape

import httpx
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models import Invoice, Order, OrderItem, Product, ProductVariant, User

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parent.parent
THUMB_MAX = 0.52 * inch
# KofKaN luxury palette (warm ink, antique gold, cream accents)
BRAND_PRIMARY = colors.HexColor("#2c1810")
BRAND_ACCENT = colors.HexColor("#c9a962")
BRAND_DEEP = colors.HexColor("#5c1528")
TEXT_MUTED = colors.HexColor("#7a6a62")
TEXT_BODY = colors.HexColor("#3d342f")
PANEL_CREAM = colors.HexColor("#faf7f2")
GRID_LINE = colors.HexColor("#e5ddd3")
HEADER_TEXT_MUTED = colors.HexColor("#d4c4b0")
LOGO_MAX_W = 1.15 * inch


def _fmt_money(amount: float, currency_code: str) -> str:
    return f"{currency_code} {amount:,.2f}"


def _status_display(status: str) -> str:
    return status.replace("_", " ").title()


def _load_product_image_bytes(image_url: Optional[str]) -> Optional[bytes]:
    """Load raw image bytes from HTTPS URL or local `/uploads/...` path."""
    if not image_url or not str(image_url).strip():
        return None
    u = str(image_url).strip()
    try:
        if u.startswith(("http://", "https://")):
            with httpx.Client(timeout=12.0, follow_redirects=True) as client:
                r = client.get(u)
                if r.status_code == 200 and r.content:
                    return r.content
            return None
        if u.startswith("/uploads/"):
            rel = u.lstrip("/")
            path = BACKEND_ROOT / rel
            if path.is_file():
                return path.read_bytes()
    except Exception as exc:
        logger.warning("Invoice image load failed for %s: %s", u, exc)
    return None


def _thumbnail_flowable(image_url: Optional[str]) -> Paragraph | Image:
    """Small square thumbnail or a minimal placeholder."""
    data = _load_product_image_bytes(image_url)
    if not data:
        ph = ParagraphStyle(
            "ImgPh",
            parent=getSampleStyleSheet()["Normal"],
            fontSize=8,
            textColor=TEXT_MUTED,
            alignment=1,
        )
        return Paragraph("—", ph)

    try:
        ir = ImageReader(io.BytesIO(data))
        iw, ih = ir.getSize()
        if iw <= 0 or ih <= 0:
            raise ValueError("invalid image dimensions")
        scale = min(THUMB_MAX / iw, THUMB_MAX / ih)
        w, h = iw * scale, ih * scale
        return Image(ImageReader(io.BytesIO(data)), width=w, height=h, mask="auto")
    except Exception as exc:
        logger.warning("Invoice thumbnail build failed: %s", exc)
        ph = ParagraphStyle(
            "ImgPh",
            parent=getSampleStyleSheet()["Normal"],
            fontSize=8,
            textColor=TEXT_MUTED,
            alignment=1,
        )
        return Paragraph("—", ph)


def _header_logo_flowable() -> Image | None:
    """Optional brand mark from EMAIL_LOGO_URL (HTTPS or local file supported)."""
    url = os.getenv("EMAIL_LOGO_URL", "").strip()
    if not url:
        return None
    data = _load_product_image_bytes(url)
    if not data:
        return None
    try:
        ir = ImageReader(io.BytesIO(data))
        iw, ih = ir.getSize()
        if iw <= 0 or ih <= 0:
            return None
        scale = min(LOGO_MAX_W / iw, 0.45 * inch / ih)
        w, h = iw * scale, ih * scale
        return Image(ImageReader(io.BytesIO(data)), width=w, height=h, mask="auto")
    except Exception as exc:
        logger.warning("Invoice header logo failed: %s", exc)
        return None


class InvoiceService:
    """Generate KofKaN Store PDF invoices."""

    @staticmethod
    def generate_invoice_pdf(
        invoice: Invoice,
        order: Order,
        user: User,
        order_items: list[OrderItem],
        products_by_id: Optional[dict[int, Product]] = None,
        variants_by_id: Optional[dict[int, ProductVariant]] = None,
        company_name: str = "KofKaN Store",
        currency_code: str | None = None,
    ) -> bytes:
        """
        Build a branded PDF invoice with product names, SKUs, and images.

        Args:
            invoice: Invoice row
            order: Order row
            user: Billing customer
            order_items: Line items
            products_by_id: Map of product id -> Product (for names, SKU, images)
            variants_by_id: Map of variant id -> ProductVariant for variant lines
            company_name: Header brand (default KofKaN Store)
            currency_code: ISO currency for amounts (default PAYSTACK_CURRENCY or GHS)
        """
        cur = (currency_code or os.getenv("PAYSTACK_CURRENCY", "GHS")).strip().upper()
        products_by_id = products_by_id or {}
        variants_by_id = variants_by_id or {}
        items_sorted = sorted(order_items, key=lambda x: (x.id or 0))

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.55 * inch,
            leftMargin=0.55 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.55 * inch,
            title=f"Invoice {invoice.invoice_number}",
        )

        styles = getSampleStyleSheet()
        brand_sub = ParagraphStyle(
            "BrandSub",
            parent=styles["Normal"],
            fontSize=9,
            textColor=HEADER_TEXT_MUTED,
            leading=12,
        )
        h_section = ParagraphStyle(
            "HSection",
            parent=styles["Heading2"],
            fontSize=11,
            textColor=BRAND_PRIMARY,
            spaceBefore=10,
            spaceAfter=6,
            fontName="Helvetica-Bold",
        )
        body = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=9.5,
            textColor=TEXT_BODY,
            leading=13,
        )
        small = ParagraphStyle(
            "Small",
            parent=styles["Normal"],
            fontSize=8,
            textColor=TEXT_MUTED,
            leading=11,
        )
        product_title = ParagraphStyle(
            "ProdTitle",
            parent=styles["Normal"],
            fontSize=9.5,
            textColor=TEXT_BODY,
            leading=12,
            fontName="Helvetica-Bold",
        )

        elements: list = []

        # --- Header band ---
        issued = invoice.issued_at.strftime("%Y-%m-%d") if invoice.issued_at else "—"
        left_block = (
            f"<b><font size='20' color='white'>{escape(company_name)}</font></b><br/>"
            f"<font size='9' color='#d4c4b0'>Official tax invoice · {escape(issued)}</font>"
        )
        right_block = (
            f"<para alignment='right'>"
            f"<font size='22' color='white'>INVOICE</font><br/>"
            f"<font size='9' color='#d4c4b0'>{escape(invoice.invoice_number)}</font><br/>"
            f"<font size='9' color='#d4c4b0'>Order ORD-{order.id}</font>"
            f"</para>"
        )
        logo = _header_logo_flowable()
        left_stack_rows: list[list] = []
        if logo is not None:
            left_stack_rows.append([logo])
        left_stack_rows.append([Paragraph(left_block, brand_sub)])
        left_cell = Table(left_stack_rows, colWidths=[4.15 * inch])
        left_cell.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (0, 0), 8 if logo is not None else 0),
                ]
            )
        )
        header_tbl = Table(
            [[left_cell, Paragraph(right_block, brand_sub)]],
            colWidths=[4.15 * inch, 3.35 * inch],
        )
        header_tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), BRAND_PRIMARY),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 16),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                    ("TOPPADDING", (0, 0), (-1, -1), 20),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 20),
                    ("LINEABOVE", (0, 0), (-1, 0), 2, BRAND_ACCENT),
                ]
            )
        )
        elements.append(header_tbl)
        elements.append(Spacer(1, 0.28 * inch))

        # --- Meta grid ---
        due = (
            invoice.due_at.strftime("%Y-%m-%d")
            if invoice.due_at
            else "Upon receipt"
        )
        meta = [
            ["Invoice date", issued, "Due date", due],
            [
                "Payment status",
                _status_display(invoice.status),
                "Payment method",
                (order.payment_method or "—").replace("_", " ").title(),
            ],
        ]
        meta_tbl = Table(meta, colWidths=[1.15 * inch, 2.05 * inch, 1.15 * inch, 2.05 * inch])
        meta_tbl.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                    ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                    ("FONTNAME", (3, 0), (3, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("TEXTCOLOR", (0, 0), (0, -1), TEXT_MUTED),
                    ("TEXTCOLOR", (2, 0), (2, -1), TEXT_MUTED),
                    ("TEXTCOLOR", (1, 0), (1, -1), TEXT_BODY),
                    ("TEXTCOLOR", (3, 0), (3, -1), TEXT_BODY),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("LINEBELOW", (0, -1), (-1, -1), 0.5, GRID_LINE),
                ]
            )
        )
        elements.append(meta_tbl)
        elements.append(Spacer(1, 0.22 * inch))

        # --- Bill to / Ship to ---
        elements.append(Paragraph("Bill to", h_section))
        fn_ln = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
        display_name = fn_ln or (user.name or "").strip() or (user.email or "Customer")
        name = escape(display_name)
        bill_lines = f"<b>{name}</b><br/>{escape(user.email or '')}"
        if user.phone:
            bill_lines += f"<br/>{escape(user.phone)}"
        elements.append(Paragraph(bill_lines, body))

        if order.shipping_address:
            elements.append(Paragraph("Ship to", h_section))
            elements.append(Paragraph(escape(order.shipping_address), body))

        elements.append(Spacer(1, 0.2 * inch))
        elements.append(Paragraph("Line items", h_section))

        # --- Line items (image + product + sku + qty + unit + line total) ---
        hdr = [
            "",
            "Product",
            "SKU",
            "Qty",
            f"Unit ({cur})",
            f"Line ({cur})",
        ]
        rows: list[list] = [hdr]
        col_w = [0.62 * inch, 2.35 * inch, 0.82 * inch, 0.42 * inch, 0.92 * inch, 0.92 * inch]

        for item in items_sorted:
            prod = products_by_id.get(item.product_id)
            var = (
                variants_by_id.get(item.variant_id)
                if item.variant_id
                else None
            )
            if item.variant_id:
                pname = (
                    (item.variant_name or "").strip()
                    or (var.name if var else None)
                    or (prod.name if prod else None)
                    or f"Product #{item.product_id}"
                )
                sku = (
                    (var.sku if var and var.sku else None)
                    or (prod.sku if prod and prod.sku else None)
                    or "—"
                )
                snap_img = (item.variant_image_url or "").strip() or None
                img_url = snap_img or (var.image_url if var else None)
                detail_src = (item.variant_detail_snapshot or "").strip() or None
                if not detail_src and var:
                    if var.description and var.description.strip():
                        detail_src = var.description.strip()
                    elif var.attributes and var.attributes.strip():
                        detail_src = var.attributes.strip()
            else:
                pname = (
                    (prod.name if prod else None)
                    or f"Product #{item.product_id}"
                )
                sku = prod.sku if prod and prod.sku else "—"
                img_url = prod.image_url if prod else None
                detail_src = prod.description.strip() if prod and prod.description else None

            thumb = _thumbnail_flowable(img_url)
            desc_bits = f"<b>{escape(pname)}</b>"
            if detail_src:
                desc_short = detail_src
                if len(desc_short) > 120:
                    desc_short = desc_short[:117] + "…"
                desc_bits += f"<br/><font size='8' color='#7a6a62'>{escape(desc_short)}</font>"
            desc = Paragraph(desc_bits, product_title)
            line_total = float(item.quantity * item.price_at_purchase)
            rows.append(
                [
                    thumb,
                    desc,
                    Paragraph(f"<para alignment='center'>{escape(sku)}</para>", small),
                    Paragraph(f"<para alignment='center'>{item.quantity}</para>", body),
                    Paragraph(
                        f"<para alignment='right'>{_fmt_money(float(item.price_at_purchase), cur)}</para>",
                        body,
                    ),
                    Paragraph(
                        f"<para alignment='right'><b>{_fmt_money(line_total, cur)}</b></para>",
                        body,
                    ),
                ]
            )

        items_tbl = Table(rows, colWidths=col_w, repeatRows=1)
        items_tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), PANEL_CREAM),
                    ("TEXTCOLOR", (0, 0), (-1, 0), BRAND_PRIMARY),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
                    ("TOPPADDING", (0, 0), (-1, 0), 10),
                    ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                    ("ALIGN", (0, 1), (0, -1), "CENTER"),
                    ("VALIGN", (0, 1), (-1, -1), "MIDDLE"),
                    ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 1), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, GRID_LINE),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PANEL_CREAM]),
                ]
            )
        )
        elements.append(items_tbl)
        elements.append(Spacer(1, 0.18 * inch))

        # --- Totals ---
        totals = Table(
            [
                ["Subtotal", _fmt_money(float(invoice.subtotal), cur)],
                ["Tax", _fmt_money(float(invoice.tax), cur)],
                ["Shipping", _fmt_money(float(invoice.shipping), cur)],
                ["Total due", _fmt_money(float(invoice.total), cur)],
            ],
            colWidths=[4.85 * inch, 2.65 * inch],
        )
        totals.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("FONTNAME", (0, 0), (0, -2), "Helvetica"),
                    ("FONTNAME", (1, 0), (1, -2), "Helvetica"),
                    ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -2), 10),
                    ("FONTSIZE", (0, -1), (-1, -1), 12),
                    ("TEXTCOLOR", (0, -1), (-1, -1), BRAND_DEEP),
                    ("LINEABOVE", (0, -1), (-1, -1), 1, BRAND_ACCENT),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elements.append(totals)

        if order.tracking_number or order.shipping_provider:
            elements.append(Spacer(1, 0.22 * inch))
            elements.append(Paragraph("Shipping", h_section))
            ship_parts = []
            if order.shipping_provider:
                ship_parts.append(f"Provider: {escape(order.shipping_provider)}")
            if order.tracking_number:
                ship_parts.append(f"Tracking: {escape(order.tracking_number)}")
            if order.estimated_delivery:
                ship_parts.append(
                    f"Est. delivery: {order.estimated_delivery.strftime('%Y-%m-%d')}"
                )
            elements.append(Paragraph("<br/>".join(ship_parts), body))

        # --- Footer ---
        elements.append(Spacer(1, 0.35 * inch))
        year = datetime.utcnow().year
        footer_txt = (
            f"<para alignment='center'><font size='8' color='#7a6a62'>"
            f"Thank you for shopping with {escape(company_name)}.<br/>"
            f"This document was generated electronically and is valid without signature.<br/>"
            f"© {year} {escape(company_name)} · Invoice {escape(invoice.invoice_number)}"
            f"</font></para>"
        )
        elements.append(Paragraph(footer_txt, small))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generate_invoice_number(order_id: int, invoice_id: int) -> str:
        timestamp = datetime.utcnow().strftime("%Y%m")
        return f"INV-{timestamp}-{invoice_id:05d}"
