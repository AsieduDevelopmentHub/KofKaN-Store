"""
Shared HTML layout and KofKaN brand tokens for transactional emails.
"""
from __future__ import annotations

import html
import os
from urllib.parse import quote

# KofKaN Technologies — soft monochrome palette (email-safe)
# Keep these as hex constants because many email clients strip CSS variables.
INK = "#12161D"
ACCENT = "#AEB7C2"
ACCENT_DARK = "#8E98A6"
BG = "#F5F6F8"
PAPER = "#FFFFFF"
STROKE = "#E2E6EC"
MUTED = "#8A95A5"
INK_SOFT = "#3E4652"

_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
_logo_url = os.getenv("EMAIL_LOGO_URL", "").strip()


def brand_wordmark_html() -> str:
    """Text logo when EMAIL_LOGO_URL is not set."""
    return (
        f'<span style="font-family:Georgia,\'Times New Roman\',serif;font-size:28px;'
        f'font-weight:600;letter-spacing:0.06em;color:{INK};">KofKaN</span>'
        f'<span style="font-family:Georgia,serif;font-size:11px;display:block;'
        f'color:{MUTED};letter-spacing:0.2em;text-transform:uppercase;margin-top:4px;">'
        f'Technologies</span>'
    )


def header_block() -> str:
    if _logo_url:
        safe = html.escape(_logo_url, quote=True)
        return (
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="border-bottom:2px solid {ACCENT};padding-bottom:20px;margin-bottom:24px;">'
            f"<tr><td align=\"center\">"
            f'<img src="{safe}" alt="KofKaN" width="180" style="display:block;'
            f'max-width:180px;height:auto;border:0;margin:0 auto;" />'
            f"</td></tr></table>"
        )
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="border-bottom:2px solid {ACCENT};padding-bottom:20px;margin-bottom:24px;">'
        f'<tr><td align="center">{brand_wordmark_html()}</td></tr></table>'
    )


def preheader_span(text: str) -> str:
    t = html.escape(text.strip())
    return (
        f'<div style="display:none;font-size:1px;color:{BG};line-height:1px;'
        f'max-height:0;max-width:0;opacity:0;overflow:hidden;">{t}</div>'
    )


def wrap_email(
    *,
    title: str,
    preheader: str,
    inner_html: str,
) -> str:
    """Full document: preheader, header, cream panel, footer."""
    safe_title = html.escape(title)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{safe_title}</title>
</head>
<body style="margin:0;padding:0;background-color:{BG};">
{preheader_span(preheader) if preheader else ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{BG};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:{PAPER};border-radius:12px;border:1px solid {STROKE};overflow:hidden;box-shadow:0 10px 30px rgba(16,19,24,0.08);">
<tr><td style="padding:32px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:{INK};font-size:15px;line-height:1.55;">
{header_block()}
<h1 style="margin:0 0 16px;font-size:22px;font-weight:650;color:{INK};letter-spacing:-0.02em;">{safe_title}</h1>
{inner_html}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;padding-top:24px;border-top:1px solid {STROKE};">
<tr><td style="font-size:13px;color:{MUTED};">
With appreciation,<br/>
<span style="color:{INK};font-weight:650;">KofKaN Technologies</span>
</td></tr></table>
</td></tr></table>
<p style="max-width:600px;margin:20px auto 0;font-size:12px;color:{MUTED};text-align:center;line-height:1.5;">
You are receiving this message because you have an account or order with KofKaN Technologies.<br/>
<a href="{html.escape(_frontend_url, quote=True)}" style="color:{ACCENT_DARK};text-decoration:none;">Visit KofKaN</a>
</p>
</td></tr></table>
</body>
</html>"""


def paragraph(text: str) -> str:
    return f'<p style="margin:0 0 16px;color:{INK};">{html.escape(text)}</p>'


def muted_paragraph(text: str) -> str:
    return f'<p style="margin:0 0 16px;color:{MUTED};font-size:14px;">{html.escape(text)}</p>'


def greeting_line(name: str) -> str:
    n = html.escape(name.strip() or "there")
    return paragraph(f"Hello {n},")


def otp_box(code: str) -> str:
    c = html.escape(code.strip())
    return (
        f'<div style="background:{BG};border:1px solid {STROKE};border-radius:10px;'
        f'padding:24px;text-align:center;margin:24px 0;">'
        f'<span style="font-size:26px;font-weight:650;letter-spacing:0.25em;color:{INK};">{c}</span></div>'
    )


def primary_button(href: str, label: str) -> str:
    h = html.escape(href, quote=True)
    l = html.escape(label)
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">'
        f'<tr><td align="center" style="border-radius:8px;background:{INK};">'
        f'<a href="{h}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:650;'
        f'color:#ffffff;text-decoration:none;border-radius:8px;">{l}</a>'
        f"</td></tr></table>"
    )


def link_fallback(url: str) -> str:
    u = html.escape(url, quote=True)
    return (
        f'<p style="margin:16px 0 0;font-size:13px;color:{MUTED};">'
        f"If the button does not work, copy this link:</p>"
        f'<p style="margin:8px 0 0;word-break:break-all;font-size:12px;color:{INK_SOFT};">{u}</p>'
    )


def order_lines_table(
    line_items: list[dict],
    currency: str,
) -> str:
    """line_items: name, qty, unit_price, line_total, image_url (optional https)."""
    cur = html.escape(currency.strip().upper() or "GHS")
    rows = []
    for li in line_items:
        name = html.escape(str(li.get("name", "Item")))
        qty = int(li.get("qty", 0) or 0)
        unit = float(li.get("unit_price", 0) or 0)
        lt = float(li.get("line_total", 0) or 0)
        img = li.get("image_url")
        img_html = ""
        if img and str(img).startswith("https://"):
            iu = html.escape(str(img).strip(), quote=True)
            img_html = (
                f'<img src="{iu}" width="56" height="56" alt="" style="display:block;width:56px;'
                f'height:56px;object-fit:cover;border-radius:8px;border:1px solid {STROKE};" />'
            )
        else:
            img_html = (
                f'<div style="width:56px;height:56px;border-radius:8px;background:{BG};'
                f'border:1px solid {STROKE};"></div>'
            )
        detail_html = ""
        det_raw = li.get("detail")
        if det_raw and str(det_raw).strip():
            d = html.escape(str(det_raw).strip())
            if len(d) > 180:
                d = d[:177] + "…"
            detail_html = f'<br/><span style="color:{MUTED};font-size:11px;line-height:1.35;">{d}</span>'
        rows.append(
            f"<tr>"
            f'<td style="padding:12px 8px 12px 0;vertical-align:middle;width:64px;">{img_html}</td>'
            f'<td style="padding:12px 8px;vertical-align:middle;color:{INK};font-size:14px;">'
            f"<b>{name}</b>{detail_html}<br/>"
            f'<span style="color:{MUTED};font-size:12px;">Qty {qty} × {cur} {unit:,.2f}</span>'
            f"</td>"
            f'<td style="padding:12px 0 12px 8px;vertical-align:middle;text-align:right;'
            f'white-space:nowrap;font-size:14px;font-weight:600;color:{INK};">'
            f"{cur} {lt:,.2f}</td>"
            f"</tr>"
        )
    body = "\n".join(rows)
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="border:1px solid {STROKE};border-radius:10px;overflow:hidden;margin:20px 0;">'
        f'<tr style="background:{BG};">'
        f'<th align="left" style="padding:10px 8px 10px 12px;font-size:11px;text-transform:uppercase;'
        f'letter-spacing:0.08em;color:{MUTED};"></th>'
        f'<th align="left" style="padding:10px 8px;font-size:11px;text-transform:uppercase;'
        f'letter-spacing:0.08em;color:{MUTED};">Item</th>'
        f'<th align="right" style="padding:10px 12px 10px 8px;font-size:11px;text-transform:uppercase;'
        f'letter-spacing:0.08em;color:{MUTED};">Line</th>'
        f"</tr>"
        f"{body}</table>"
    )


def order_total_bar(order_total: float, currency: str) -> str:
    cur = html.escape(currency.strip().upper() or "GHS")
    return (
        f'<div style="background:linear-gradient(135deg,{BG} 0%,#eef1f6 100%);'
        f'border:1px solid {STROKE};border-radius:10px;padding:20px 22px;margin:8px 0 4px;">'
        f'<table role="presentation" width="100%"><tr>'
        f'<td style="font-size:14px;color:{MUTED};">Order total</td>'
        f'<td align="right" style="font-size:20px;font-weight:750;color:{INK};">'
        f"{cur} {order_total:,.2f}</td>"
        f"</tr></table></div>"
    )


def reset_password_url(token: str) -> str:
    return f"{_frontend_url}/reset-password/{quote(token, safe='')}"
