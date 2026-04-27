"""
Row Level Security (RLS) for Sikapa — PostgreSQL only.

Run after Alembic migrations:
    cd backend && python tools/rls/rls_setup.py

The API sets transaction-local GUC app.current_user_id from each request JWT
(see app/db.py). Policies use app.current_uid() and app.is_admin().
SECURITY DEFINER functions in schema app implement login, JWT resolution,
newsletter, and Paystack webhook flows without exposing tables to anonymous
SELECT. See app/core/pg_rls_auth.py for Python callers.
"""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in environment variables")
    sys.exit(1)

if not DATABASE_URL.startswith("postgresql"):
    print("RLS setup is for PostgreSQL only; skipping.")
    sys.exit(0)


TABLES = [
    "product",
    "category",
    "productvariant",
    "productimage",
    "cartitem",
    "wishlistitem",
    "review",
    "reviewmedia",
    "emailsubscription",
    '"user"',
    '"order"',
    "orderitem",
    "invoice",
    "paystack_init_idempotency",
    "paystack_transaction",
    "adminauditlog",
    "inventoryadjustment",
    "coupon",
    "couponusage",
    "businesssetting",
    "orderreturn",
    "orderreturnitem",
    "searchquerylog",
    "tokenblacklist",
    "otpcode",
    "twofactorsecret",
    "passwordreset",
]


def _drop_existing_policies(conn) -> None:
    conn.execute(
        text(
            """
            DO $drop$
            DECLARE
              r record;
            BEGIN
              FOR r IN
                SELECT schemaname, tablename, policyname
                FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename IN (
                    'product','category','productvariant','productimage',
                    'cartitem','wishlistitem','review','reviewmedia',
                    'emailsubscription','user','order','orderitem','invoice',
                    'paystack_init_idempotency','paystack_transaction',
                    'adminauditlog','inventoryadjustment','coupon','couponusage',
                    'businesssetting','orderreturn','orderreturnitem',
                    'searchquerylog',
                    'tokenblacklist','otpcode','twofactorsecret','passwordreset'
                  )
              LOOP
                EXECUTE format(
                  'DROP POLICY IF EXISTS %I ON %I.%I',
                  r.policyname, r.schemaname, r.tablename
                );
              END LOOP;
            END
            $drop$;
            """
        )
    )


def setup_rls_policies() -> None:
    engine = create_engine(DATABASE_URL, echo=False)

    ddl = [
        "CREATE SCHEMA IF NOT EXISTS app;",
        """
        CREATE OR REPLACE FUNCTION app.current_uid() RETURNS integer AS $$
        DECLARE
          v text;
        BEGIN
          v := current_setting('app.current_user_id', true);
          IF v IS NULL OR btrim(v) = '' THEN
            RETURN NULL;
          END IF;
          RETURN v::integer;
        EXCEPTION
          WHEN OTHERS THEN
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql STABLE;
        """,
        """
        CREATE OR REPLACE FUNCTION app.is_admin() RETURNS boolean AS $$
        DECLARE
          v integer;
          adm boolean;
        BEGIN
          v := app.current_uid();
          IF v IS NULL THEN
            RETURN false;
          END IF;
          SELECT u.is_admin INTO adm FROM "user" u WHERE u.id = v;
          RETURN COALESCE(adm, false);
        END;
        $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.get_order_user_for_paystack(p_ref text)
        RETURNS integer AS $$
          SELECT user_id FROM "order" WHERE paystack_reference = p_ref LIMIT 1;
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.user_for_login(p_identifier text)
        RETURNS SETOF "user" AS $$
          SELECT * FROM "user" u
          WHERE (
            (strpos(p_identifier, '@') > 0 AND strpos(p_identifier, '.') > 0
             AND lower(trim(u.email)) = lower(trim(p_identifier)))
            OR
            (NOT (strpos(p_identifier, '@') > 0 AND strpos(p_identifier, '.') > 0)
             AND lower(trim(u.username)) = lower(trim(p_identifier)))
          )
          LIMIT 1;
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.resolve_user_subject(p_sub text)
        RETURNS SETOF "user" AS $$
          SELECT * FROM "user" u
          WHERE (
            (trim(p_sub) ~ '^[0-9]+$' AND u.id = trim(p_sub)::integer)
            OR lower(trim(u.email)) = lower(trim(p_sub))
            OR lower(trim(u.username)) = lower(trim(p_sub))
          )
          LIMIT 1;
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.username_taken(u text)
        RETURNS boolean AS $$
          SELECT EXISTS (
            SELECT 1 FROM "user" usr WHERE lower(trim(usr.username)) = lower(trim(u))
          );
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.email_taken(e text)
        RETURNS boolean AS $$
          SELECT EXISTS (
            SELECT 1 FROM "user" usr
            WHERE usr.email IS NOT NULL
              AND lower(trim(usr.email)) = lower(trim(e))
          );
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.fetch_password_reset_active(p_token text)
        RETURNS SETOF passwordreset AS $$
          SELECT * FROM passwordreset pr
          WHERE pr.token = p_token AND pr.used = false;
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.user_by_google_sub(p_sub text)
        RETURNS SETOF "user" AS $$
          SELECT * FROM "user" WHERE google_sub = p_sub LIMIT 1;
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.user_by_email_exact(p_email text)
        RETURNS SETOF "user" AS $$
          SELECT * FROM "user"
          WHERE email IS NOT NULL
            AND lower(trim(email)) = lower(trim(p_email))
          LIMIT 1;
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.emailsubscription_by_email(p_email text)
        RETURNS SETOF emailsubscription AS $$
          SELECT * FROM emailsubscription
          WHERE lower(trim(email)) = lower(trim(p_email));
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.emailsubscription_by_verify_token(p_token text)
        RETURNS SETOF emailsubscription AS $$
          SELECT * FROM emailsubscription
          WHERE verification_token = p_token;
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.newsletter_active_recipients()
        RETURNS SETOF emailsubscription AS $$
          SELECT * FROM emailsubscription
          WHERE is_subscribed AND verified;
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.emailsubscription_reactivate(p_email text)
        RETURNS SETOF emailsubscription AS $$
          UPDATE emailsubscription e
          SET is_subscribed = true, unsubscribed_at = NULL
          WHERE lower(trim(e.email)) = lower(trim(p_email))
            AND e.is_subscribed = false
          RETURNING *;
        $$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.emailsubscription_verify_done(p_token text)
        RETURNS SETOF emailsubscription AS $$
          UPDATE emailsubscription e
          SET verified = true
          WHERE e.verification_token = p_token AND e.verified = false
          RETURNING *;
        $$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.emailsubscription_unsubscribe_email(p_email text)
        RETURNS void AS $$
        BEGIN
          UPDATE emailsubscription
          SET is_subscribed = false, unsubscribed_at = now()
          WHERE lower(trim(email)) = lower(trim(p_email))
            AND is_subscribed = true;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.emailsubscription_unsubscribe_token(p_token text)
        RETURNS void AS $$
        BEGIN
          UPDATE emailsubscription
          SET is_subscribed = false, unsubscribed_at = now()
          WHERE verification_token = p_token
            AND is_subscribed = true;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.user_public_profile(p_id integer)
        RETURNS TABLE(id integer, first_name text, email text, name text, username text) AS $$
          SELECT u.id, u.first_name, u.email, u.name, u.username
          FROM "user" u WHERE u.id = p_id;
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.username_taken_except(u text, except_id integer)
        RETURNS boolean AS $$
          SELECT EXISTS (
            SELECT 1 FROM "user" usr
            WHERE lower(trim(usr.username)) = lower(trim(u))
              AND usr.id <> except_id
          );
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        """
        CREATE OR REPLACE FUNCTION app.email_taken_except(e text, except_id integer)
        RETURNS boolean AS $$
          SELECT EXISTS (
            SELECT 1 FROM "user" usr
            WHERE usr.email IS NOT NULL
              AND lower(trim(usr.email)) = lower(trim(e))
              AND usr.id <> except_id
          );
        $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
        """,
        "DROP FUNCTION IF EXISTS app.bypass_rls();",
    ]

    policies = [
        # --- Catalog (public read only active catalog rows) ---
        """CREATE POLICY p_product_select ON product FOR SELECT
           USING (is_active OR app.is_admin());""",
        """CREATE POLICY p_product_ins ON product FOR INSERT
           WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_product_upd ON product FOR UPDATE
           USING (app.is_admin()) WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_product_del ON product FOR DELETE
           USING (app.is_admin());""",
        """CREATE POLICY p_category_select ON category FOR SELECT
           USING (is_active OR app.is_admin());""",
        """CREATE POLICY p_category_ins ON category FOR INSERT
           WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_category_upd ON category FOR UPDATE
           USING (app.is_admin()) WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_category_del ON category FOR DELETE
           USING (app.is_admin());""",
        """CREATE POLICY p_variant_select ON productvariant FOR SELECT
           USING (
             EXISTS (
               SELECT 1 FROM product p
               WHERE p.id = productvariant.product_id
               AND (p.is_active OR app.is_admin())
             )
             AND (productvariant.is_active OR app.is_admin())
           );""",
        """CREATE POLICY p_variant_ins ON productvariant FOR INSERT
           WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_variant_upd ON productvariant FOR UPDATE
           USING (app.is_admin()) WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_variant_del ON productvariant FOR DELETE
           USING (app.is_admin());""",
        """CREATE POLICY p_productimage_select ON productimage FOR SELECT
           USING (
             EXISTS (
               SELECT 1 FROM product p
               WHERE p.id = productimage.product_id
               AND (p.is_active OR app.is_admin())
             )
           );""",
        """CREATE POLICY p_productimage_ins ON productimage FOR INSERT
           WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_productimage_upd ON productimage FOR UPDATE
           USING (app.is_admin()) WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_productimage_del ON productimage FOR DELETE
           USING (app.is_admin());""",
        # Reviews
        """CREATE POLICY p_review_select ON review FOR SELECT
           USING (
             EXISTS (
               SELECT 1 FROM product p
               WHERE p.id = review.product_id AND (p.is_active OR app.is_admin())
             )
           );""",
        """CREATE POLICY p_review_ins ON review FOR INSERT
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_review_upd ON review FOR UPDATE
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_review_del ON review FOR DELETE
           USING (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_reviewmedia_select ON reviewmedia FOR SELECT
           USING (
             EXISTS (
               SELECT 1 FROM review r
               JOIN product p ON p.id = r.product_id
               WHERE r.id = reviewmedia.review_id
               AND (p.is_active OR app.is_admin())
             )
           );""",
        """CREATE POLICY p_reviewmedia_ins ON reviewmedia FOR INSERT
           WITH CHECK (
             EXISTS (
               SELECT 1 FROM review r
               WHERE r.id = reviewmedia.review_id
               AND (r.user_id = app.current_uid() OR app.is_admin())
             )
           );""",
        """CREATE POLICY p_reviewmedia_upd ON reviewmedia FOR UPDATE
           USING (
             EXISTS (
               SELECT 1 FROM review r
               WHERE r.id = reviewmedia.review_id
               AND (r.user_id = app.current_uid() OR app.is_admin())
             )
           )
           WITH CHECK (
             EXISTS (
               SELECT 1 FROM review r
               WHERE r.id = reviewmedia.review_id
               AND (r.user_id = app.current_uid() OR app.is_admin())
             )
           );""",
        """CREATE POLICY p_reviewmedia_del ON reviewmedia FOR DELETE
           USING (
             EXISTS (
               SELECT 1 FROM review r
               WHERE r.id = reviewmedia.review_id
               AND (r.user_id = app.current_uid() OR app.is_admin())
             )
           );""",
        # user — no anonymous full-table reads (use app.user_for_login etc.)
        """CREATE POLICY p_user_select ON "user" FOR SELECT USING (
           id = app.current_uid() OR app.is_admin()
        );""",
        """CREATE POLICY p_user_ins ON "user" FOR INSERT WITH CHECK (
           app.current_uid() IS NULL OR app.is_admin()
        );""",
        """CREATE POLICY p_user_upd ON "user" FOR UPDATE
           USING (id = app.current_uid() OR app.is_admin())
           WITH CHECK (id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_user_del ON "user" FOR DELETE USING (app.is_admin());""",
        # orders
        """CREATE POLICY p_order_all ON "order" FOR ALL
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_orderitem_all ON orderitem FOR ALL
           USING (
             EXISTS (
               SELECT 1 FROM "order" o
               WHERE o.id = orderitem.order_id
               AND (o.user_id = app.current_uid() OR app.is_admin())
             )
           )
           WITH CHECK (
             EXISTS (
               SELECT 1 FROM "order" o
               WHERE o.id = orderitem.order_id
               AND (o.user_id = app.current_uid() OR app.is_admin())
             )
           );""",
        """CREATE POLICY p_invoice_all ON invoice FOR ALL
           USING (
             EXISTS (
               SELECT 1 FROM "order" o
               WHERE o.id = invoice.order_id
               AND (o.user_id = app.current_uid() OR app.is_admin())
             )
           )
           WITH CHECK (
             EXISTS (
               SELECT 1 FROM "order" o
               WHERE o.id = invoice.order_id
               AND (o.user_id = app.current_uid() OR app.is_admin())
             )
           );""",
        """CREATE POLICY p_cartitem_all ON cartitem FOR ALL
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_wishlist_all ON wishlistitem FOR ALL
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_paystack_init_all ON paystack_init_idempotency FOR ALL
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_paystack_tx_all ON paystack_transaction FOR ALL
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_tokenblacklist_all ON tokenblacklist FOR ALL
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_otp_all ON otpcode FOR ALL
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_twofactor_all ON twofactorsecret FOR ALL
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        # Password reset rows only via SECURITY DEFINER fetch + owner/admin
        """CREATE POLICY p_pwdreset_select ON passwordreset FOR SELECT
           USING (app.is_admin() OR user_id = app.current_uid());""",
        """CREATE POLICY p_pwdreset_ins ON passwordreset FOR INSERT
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_pwdreset_upd ON passwordreset FOR UPDATE
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_pwdreset_del ON passwordreset FOR DELETE
           USING (app.is_admin());""",
        # Newsletter — mutations mostly via app.* DEFINER helpers
        """CREATE POLICY p_emailsub_sel ON emailsubscription FOR SELECT
           USING (app.is_admin() OR user_id = app.current_uid());""",
        """CREATE POLICY p_emailsub_ins ON emailsubscription FOR INSERT
           WITH CHECK (user_id IS NULL OR user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_emailsub_upd ON emailsubscription FOR UPDATE
           USING (app.is_admin() OR user_id = app.current_uid())
           WITH CHECK (app.is_admin() OR user_id = app.current_uid());""",
        """CREATE POLICY p_emailsub_del ON emailsubscription FOR DELETE
           USING (app.is_admin());""",
        """CREATE POLICY p_audit_all ON adminauditlog FOR ALL
           USING (app.is_admin()) WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_invadj_all ON inventoryadjustment FOR ALL
           USING (app.is_admin()) WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_coupon_select ON coupon FOR SELECT
           USING (
             app.is_admin()
             OR (
               is_active
               AND (expires_at IS NULL OR expires_at > now())
             )
           );""",
        """CREATE POLICY p_coupon_mut ON coupon FOR INSERT
           WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_coupon_upd ON coupon FOR UPDATE
           USING (app.is_admin()) WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_coupon_del ON coupon FOR DELETE
           USING (app.is_admin());""",
        """CREATE POLICY p_couponusage_all ON couponusage FOR ALL
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_settings_all ON businesssetting FOR ALL
           USING (app.is_admin()) WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_ret_select ON orderreturn FOR SELECT
           USING (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_ret_ins ON orderreturn FOR INSERT
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_ret_upd ON orderreturn FOR UPDATE
           USING (user_id = app.current_uid() OR app.is_admin())
           WITH CHECK (user_id = app.current_uid() OR app.is_admin());""",
        """CREATE POLICY p_ret_del ON orderreturn FOR DELETE
           USING (app.is_admin());""",
        """CREATE POLICY p_retitem_all ON orderreturnitem FOR ALL
           USING (
             EXISTS (
               SELECT 1 FROM orderreturn r
               WHERE r.id = orderreturnitem.return_id
               AND (r.user_id = app.current_uid() OR app.is_admin())
             )
           )
           WITH CHECK (
             EXISTS (
               SELECT 1 FROM orderreturn r
               WHERE r.id = orderreturnitem.return_id
               AND (r.user_id = app.current_uid() OR app.is_admin())
             )
           );""",
        """CREATE POLICY p_search_ins ON searchquerylog FOR INSERT
           WITH CHECK (true);""",
        """CREATE POLICY p_search_sel ON searchquerylog FOR SELECT
           USING (app.is_admin());""",
        """CREATE POLICY p_search_upd ON searchquerylog FOR UPDATE
           USING (app.is_admin()) WITH CHECK (app.is_admin());""",
        """CREATE POLICY p_search_del ON searchquerylog FOR DELETE
           USING (app.is_admin());""",
    ]

    enable_stmts = [f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;" for t in TABLES]
    force_stmts = [f"ALTER TABLE {t} FORCE ROW LEVEL SECURITY;" for t in TABLES]

    with engine.begin() as conn:
        _drop_existing_policies(conn)
        for stmt in ddl:
            conn.execute(text(stmt))
        for stmt in enable_stmts:
            conn.execute(text(stmt))
        for stmt in policies:
            conn.execute(text(stmt.strip()))
        for stmt in force_stmts:
            conn.execute(text(stmt))

    print("RLS enabled. Use app/core/pg_rls_auth.py helpers with DATABASE_URL role (not superuser).")


if __name__ == "__main__":
    setup_rls_policies()
    print("RLS setup complete.")
