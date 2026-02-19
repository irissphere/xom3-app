# Commerce Sales Channels – Environment Variables

Used by [xom3.io/commerce/channels](https://xom3.io/commerce/channels) for listing products to TikTok Shop, Facebook Marketplace, and Amazon.

## TikTok Shop (via CJ Dropshipping)

No extra env for listing. Use the **Open CJ TikTok integration** and **How to sync inventory** links on the Channels page. Connect TikTok in your [CJ dashboard](https://cjdropshipping.com/integrations/tiktok-shop).

- `CJ_API_KEY` – API key from [CJ dashboard](https://www.cjdropshipping.com/myCJ.html#/apikey) (format: `CJUserNum@api@xxx`) or access token. If using API key, we exchange it for an access token; if using access token directly, refresh every 15 days.

## Facebook Marketplace

- `META_CATALOG_ID` or `FACEBOOK_CATALOG_ID` – Facebook product catalog ID (from Meta Business Suite / Commerce Manager).
- `META_ACCESS_TOKEN` or `FACEBOOK_CATALOG_ACCESS_TOKEN` – Long-lived Graph API access token with `catalog_management` permission.

Create a catalog in [Commerce Manager](https://business.facebook.com/commerce), then get an access token from the [Graph API Explorer](https://developers.facebook.com/tools/explorer/) with the catalog and Page (if needed) and generate a long-lived token.

## Amazon

- `AMAZON_SELLER_ID` – Your Seller Central seller ID (e.g. from Seller Central → Settings → Account Info).
- `AMAZON_MARKETPLACE_ID` – (Optional) Marketplace ID; default `ATVPDKIKX0DER` (US).
- `AMAZON_LWA_CLIENT_ID` or `AMAZON_SP_API_CLIENT_ID` – LWA client ID from your SP-API app.
- `AMAZON_LWA_CLIENT_SECRET` or `AMAZON_SP_API_CLIENT_SECRET` – LWA client secret.
- `AMAZON_SP_API_REFRESH_TOKEN` – Refresh token from Seller Central authorization (SP-API app).

Amazon listing payloads are minimal; you may need to complete or adjust listings in Seller Central for your product type and category.
