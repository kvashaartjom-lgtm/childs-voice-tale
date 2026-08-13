# Database Blueprint

## Core tables
profiles(id, email, display_name, country_code, locale, currency)
families(id, owner_id, name)
children(id, family_id, display_name, age_bracket)
books(id, family_id, child_id, title, language, status)
book_versions(id, book_id, version_number, status)
book_pages(id, book_version_id, page_number, text, image_asset_id)
generation_jobs(id, book_version_id, job_type, status, progress, retry_count, provider, provider_job_id, error_code)
products(id, name, type, active)
product_variants(id, product_id, format, width, height, page_count, binding, paper, active)
product_prices(id, product_variant_id, country_code, currency, base_price, tax_rule_reference, active)
orders(id, user_id, book_id, book_version_id, product_variant_id, status, currency, subtotal, tax, shipping, discount, total, billing_country, shipping_country)
payments(id, order_id, provider, provider_payment_id, status, amount, currency)
fulfillment_providers(id, name, provider_type, country_scope, active)
print_jobs(id, order_id, fulfillment_provider_id, external_job_id, status, file_asset_id, submitted_at, printed_at, shipped_at)
shipments(id, order_id, print_job_id, carrier, tracking_number, status, estimated_delivery, delivered_at)
voice_profiles(id, user_id, provider, provider_voice_id, status, consent_version, created_at, deleted_at)
audio_assets(id, book_version_id, voice_profile_id, storage_key, duration, status, created_at, deleted_at)
qr_access(id, book_version_id, audio_asset_id, token_hash, status, created_at, revoked_at)

## Rules
RLS restricts users to their own data. Service-role operations remain server-side. Secrets are never stored as plaintext application data.
