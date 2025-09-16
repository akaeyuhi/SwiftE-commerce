"""
export_features.py

Export feature vectors for product-day snapshots into CSV for model training.

High-level approach:
 - Fetch product list.
 - Fetch product_daily_stats and store_daily_stats for an *extended* range
   (start_date - 29 days .. end_date) to allow computing 30-day windows for earliest snapshot.
 - Fetch product_variants (price), inventory (variant snapshots), and reviews.
 - Build per-product time series with daily frequency, compute rolling sums/metrics,
   and for each snapshot date produce a feature row + label (stockout_14d).
 - Save CSV to --out

Important:
 - DB credentials are read from env: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 - Tables referenced (names): products, product_daily_stats, store_daily_stats, product_variants,
   inventory (variant => product_variants.id), reviews
"""

from __future__ import annotations
import os
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import sqlalchemy
from sqlalchemy.engine import Engine
from tqdm import tqdm


def get_engine() -> Engine:
    host = os.environ.get("PGHOST", "localhost")
    port = os.environ.get("PGPORT", "5432")
    db = os.environ.get("PGDATABASE", "postgres")
    user = os.environ.get("PGUSER", "postgres")
    pwd = os.environ.get("PGPASSWORD", "")
    conn = f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{db}"
    return sqlalchemy.create_engine(conn, pool_pre_ping=True)


def iso_date(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def range_with_padding(start: str, end: str, pad_days: int = 29) -> (str, str):
    s = datetime.strptime(start, "%Y-%m-%d") - timedelta(days=pad_days)
    return iso_date(s), end


def load_products(engine: Engine, product_ids: List[str] = None) -> pd.DataFrame:
    sql = "SELECT id::text as id, \"storeId\"::text as \"storeId\" FROM products"
    df = pd.read_sql_query(sql, engine)
    if product_ids:
        df = df[df["id"].isin(product_ids)].reset_index(drop=True)
    return df


def fetch_product_daily_stats(engine: Engine, start: str, end: str) -> pd.DataFrame:
    sql = """
    SELECT "productId"::text as productId,
           date::date as date,
           coalesce(views,0)::bigint as views,
           coalesce(purchases,0)::bigint as purchases,
           coalesce("addToCarts",0)::bigint as addToCarts,
           coalesce(revenue,0)::numeric as revenue
    FROM product_daily_stats
    WHERE date >= :start AND date <= :end
    """
    return pd.read_sql_query(sql, engine, params={"start": start, "end": end})


def fetch_store_daily_stats(engine: Engine, start: str, end: str) -> pd.DataFrame:
    sql = """
    SELECT "storeId"::text as storeId,
           date::date as date,
           coalesce(views,0)::bigint as views,
           coalesce(purchases,0)::bigint as purchases,
           coalesce("addToCarts",0)::bigint as addToCarts,
           coalesce(revenue,0)::numeric as revenue,
           coalesce(checkouts,0)::bigint as checkouts
    FROM store_daily_stats
    WHERE date >= :start AND date <= :end
    """
    return pd.read_sql_query(sql, engine, params={"start": start, "end": end})


def fetch_variants(engine: Engine) -> pd.DataFrame:
    sql = """
    SELECT id::text as id, product::text as productId, coalesce(price,0)::numeric as price
    FROM product_variants
    """
    return pd.read_sql_query(sql, engine)


def fetch_inventory(engine: Engine) -> pd.DataFrame:
    # inventory rows: variant, quantity, updatedAt
    sql = """
    SELECT id::text as id, variant::text as variantId, coalesce(quantity,0)::bigint as quantity, "updatedAt" AT TIME ZONE 'UTC' as updatedAt
    FROM inventory
    """
    df = pd.read_sql_query(sql, engine)
    # convert to datetime
    if not df.empty:
        df["updatedAt"] = pd.to_datetime(df["updatedAt"])
    return df


def fetch_reviews(engine: Engine, start: str, end: str) -> pd.DataFrame:
    sql = """
    SELECT id::text as id, "productId"::text as productId, rating::int as rating, "createdAt" AT TIME ZONE 'UTC' as createdAt
    FROM reviews
    WHERE createdAt >= :start_dt - INTERVAL '365 days'  -- fetch a year's preceding reviews for stability
      AND createdAt <= :end_dt + INTERVAL '365 days'
    """
    df = pd.read_sql_query(sql, engine, params={"start_dt": start, "end_dt": end})
    if not df.empty:
        df["createdAt"] = pd.to_datetime(df["createdAt"])
        df["review_date"] = df["createdAt"].dt.date
    return df


def prepare_timeseries_table(prod_stats: pd.DataFrame, date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Given product_daily_stats subset for a single product, create a daily timeseries df indexed by `date_index`.
    Fill missing days with zeros for numeric columns.
    """
    if prod_stats.empty:
        # create zero frame
        df = pd.DataFrame(index=date_index)
        df["views"] = 0
        df["purchases"] = 0
        df["addToCarts"] = 0
        df["revenue"] = 0.0
        return df
    ts = prod_stats.set_index("date").reindex(date_index, fill_value=0)
    # ensure numeric
    ts["views"] = ts["views"].astype(int)
    ts["purchases"] = ts["purchases"].astype(int)
    ts["addToCarts"] = ts["addToCarts"].astype(int)
    ts["revenue"] = ts["revenue"].astype(float)
    return ts[["views", "purchases", "addToCarts", "revenue"]]


def compute_inventory_by_date(inv_df: pd.DataFrame, variants_for_prod: List[str], date_index: pd.DatetimeIndex) -> pd.Series:
    """
    For given product's variants list and date_index (range), compute inventory snapshot per date:
    - For each variant, we have historical inventory rows (variantId, updatedAt, quantity).
    - Use pandas.merge_asof to map latest quantity <= date for each variant and date.
    - Sum across variants for each date.
    """
    if inv_df.empty or len(variants_for_prod) == 0:
        return pd.Series(0, index=date_index)

    inv_sub = inv_df[inv_df["variantId"].isin(variants_for_prod)].copy()
    if inv_sub.empty:
        return pd.Series(0, index=date_index)

    inv_sub = inv_sub.sort_values("updatedAt")
    # We will make a DataFrame of all query timestamps (one per date) and then for each variant do merge_asof.
    # Build all timestamps
    dates_df = pd.DataFrame({"snapshot_date": date_index})
    # For performance: pivot inv_sub per variant with asof
    total_qty_by_date = pd.Series(0, index=date_index)

    # Process per-variant: this tends to be okay unless product has thousands of variants
    for variant in inv_sub["variantId"].unique():
        vrows = inv_sub[inv_sub["variantId"] == variant].sort_values("updatedAt")
        # build DataFrame of variant updates
        updates = vrows[["updatedAt", "quantity"]].drop_duplicates(subset=["updatedAt"])
        updates = updates.sort_values("updatedAt")
        # prepare for merge_asof
        # rename for merge
        updates = updates.rename(columns={"updatedAt": "ts", "quantity": "qty"})
        # make snapshot timestamps as ts
        snaps = pd.DataFrame({"ts": date_index})
        # perform merge_asof (both sorted ascending)
        merged = pd.merge_asof(snaps, updates, on="ts", direction="backward")
        # qty NaN -> 0
        merged["qty"] = merged["qty"].fillna(0)
        total_qty_by_date = total_qty_by_date.add(merged["qty"].values, fill_value=0)

    total_qty_by_date = total_qty_by_date.fillna(0).astype(int)
    return total_qty_by_date


def compute_reviews_cumulative(reviews_df: pd.DataFrame, product_id: str, date_index: pd.DatetimeIndex) -> (pd.Series, pd.Series):
    """
    For a product, compute cumulative review count and cumulative average rating up to each date.
    Returns (count_series, avg_series) aligned with date_index.
    """
    if reviews_df.empty or product_id not in reviews_df["productId"].unique():
        return pd.Series(0, index=date_index), pd.Series(0.0, index=date_index)

    r = reviews_df[reviews_df["productId"] == product_id].copy()
    r["date"] = r["createdAt"].dt.date
    agg = r.groupby("date")["rating"].agg(["count", "sum"]).sort_index()
    # convert index to datetime.date -> datetime64
    agg.index = pd.to_datetime(agg.index)
    agg = agg.reindex(date_index.date, fill_value=0)  # reindex by date
    agg.index = pd.to_datetime(agg.index)
    # cumulative
    c_count = agg["count"].cumsum()
    c_sum = agg["sum"].cumsum()
    c_avg = c_sum / c_count.replace(0, np.nan)
    c_avg = c_avg.fillna(0)
    # align index
    c_count.index = date_index
    c_avg.index = date_index
    return c_count, c_avg


def build_rows_for_product(
    product_id: str,
    store_id: str,
    date_range: List[str],
    prod_stats_df: pd.DataFrame,
    store_stats_df: pd.DataFrame,
    variants_df: pd.DataFrame,
    inv_df: pd.DataFrame,
    reviews_df: pd.DataFrame,
) -> List[Dict[str, Any]]:
    """
    For single product, build row dicts for each snapshot date in date_range (strings 'YYYY-MM-DD').
    """
    # extend date_index to datetime index
    date_index = pd.to_datetime(date_range)

    # subset stats for this product
    p_stats = prod_stats_df[prod_stats_df["productId"] == product_id][["date", "views", "purchases", "addToCarts", "revenue"]].copy()
    if not p_stats.empty:
        p_stats["date"] = pd.to_datetime(p_stats["date"])
    ts = prepare_timeseries_table(p_stats, date_index)

    # store aggregates subset
    store_ts = pd.DataFrame(index=date_index)
    if not store_stats_df.empty and store_id is not None:
        s_stats = store_stats_df[store_stats_df["storeId"] == store_id][["date", "views", "purchases", "addToCarts", "revenue", "checkouts"]].copy()
        if not s_stats.empty:
            s_stats["date"] = pd.to_datetime(s_stats["date"])
            s_ts = s_stats.set_index("date").reindex(date_index, fill_value=0)
            store_ts = s_ts[["views", "purchases", "addToCarts", "revenue", "checkouts"]]
        else:
            store_ts[["views", "purchases", "addToCarts", "revenue", "checkouts"]] = 0
    else:
        store_ts[["views", "purchases", "addToCarts", "revenue", "checkouts"]] = 0

    # price stats for product (avg/min/max)
    vsub = variants_df[variants_df["productId"] == product_id]
    if vsub.empty:
        avg_price = min_price = max_price = 0.0
        variant_ids = []
    else:
        avg_price = float(vsub["price"].mean())
        min_price = float(vsub["price"].min())
        max_price = float(vsub["price"].max())
        variant_ids = vsub["id"].tolist()

    # compute inventory per date
    inv_by_date = compute_inventory_by_date(inv_df, variant_ids, date_index)

    # compute cumulative reviews
    c_count, c_avg = compute_reviews_cumulative(reviews_df, product_id, date_index)

    # compute rolling windows on ts (pandas)
    # rolling windows are computed on the time series indexed by date.
    # we need windows 7,14,30 (inclusive), so window sizes: 7,14,30
    # use min_periods=1 so early dates are not dropped
    ro7 = ts.rolling(window=7, min_periods=1).sum()
    ro14 = ts.rolling(window=14, min_periods=1).sum()
    ro30 = ts.rolling(window=30, min_periods=1).sum()

    rows = []
    for idx, snapshot_date in enumerate(date_range):
        d = date_index[idx]

        sales_7 = int(ro7.iloc[idx]["purchases"])
        sales_14 = int(ro14.iloc[idx]["purchases"])
        sales_30 = int(ro30.iloc[idx]["purchases"])
        views_7 = int(ro7.iloc[idx]["views"])
        views_30 = int(ro30.iloc[idx]["views"])
        addToCarts_7 = int(ro7.iloc[idx]["addToCarts"])
        revenue_7 = float(ro7.iloc[idx]["revenue"])

        sales_7_per_day = sales_7 / 7.0
        sales_30_per_day = sales_30 / 30.0
        sales_ratio_7_30 = (sales_30 > 0) and (sales_7 / (sales_30 or 1)) or 0.0
        view_to_purchase_7 = (views_7 > 0) and (sales_7 / views_7) or 0.0

        store_views_7 = int(store_ts.iloc[idx]["views"]) if not store_ts.empty else 0
        store_purchases_7 = int(store_ts.iloc[idx]["purchases"]) if not store_ts.empty else 0

        inventory_qty = int(inv_by_date.iloc[idx]) if not inv_by_date.empty else 0
        days_since_restock = int((datetime.utcnow().date() - (inv_df["updatedAt"].max().date() if not inv_df.empty else datetime.utcnow().date())).days) if not inv_df.empty else 365

        dow = d.weekday()  # Monday 0..Sunday 6
        is_weekend = 1 if dow >= 5 else 0

        # Label: future sales in next 14 days relative to inventory snapshot
        future_start = d + timedelta(days=1)
        future_end = d + timedelta(days=14)
        # sum purchases for future window from product_daily_stats (we have loaded full range earlier incl. beyond end)
        # index by productId/date
        future_mask = (prod_stats_df["productId"] == product_id) & (pd.to_datetime(prod_stats_df["date"]) >= future_start.date()) & (pd.to_datetime(prod_stats_df["date"]) <= future_end.date())
        future_sales = int(prod_stats_df[future_mask]["purchases"].sum()) if not prod_stats_df.empty else 0
        stockout_14d = 1 if future_sales > inventory_qty else 0

        row = {
            "productId": product_id,
            "storeId": store_id,
            "snapshot_date": d.strftime("%Y-%m-%d"),
            # features
            "sales_7d": sales_7,
            "sales_14d": sales_14,
            "sales_30d": sales_30,
            "sales_7d_per_day": sales_7_per_day,
            "sales_30d_per_day": sales_30_per_day,
            "sales_ratio_7_30": sales_ratio_7_30,
            "views_7d": views_7,
            "views_30d": views_30,
            "addToCarts_7d": addToCarts_7,
            "view_to_purchase_7d": view_to_purchase_7,
            "avg_price": avg_price,
            "min_price": min_price,
            "max_price": max_price,
            "avg_rating": float(c_avg.iloc[idx]) if not c_avg.empty else 0.0,
            "rating_count": int(c_count.iloc[idx]) if not c_count.empty else 0,
            "inventory_qty": inventory_qty,
            "days_since_restock": days_since_restock,
            "store_views_7d": store_views_7,
            "store_purchases_7d": store_purchases_7,
            "day_of_week": dow,
            "is_weekend": is_weekend,
            # label columns
            "future_sales_14d": future_sales,
            "stockout_14d": stockout_14d,
        }

        rows.append(row)

    return rows


def export_features_cli(start: str, end: str, out_csv: str, product_ids: List[str] = None):
    engine = get_engine()
    # extended start for rolling windows
    padded_start, _ = range_with_padding(start, end, pad_days=29)
    print(f"Loading product list...")
    products_df = load_products(engine, product_ids)

    print("Fetching daily stats (product)...")
    prod_stats = fetch_product_daily_stats(engine, padded_start, end)
    print("Fetching store daily stats...")
    store_stats = fetch_store_daily_stats(engine, padded_start, end)
    print("Fetching variants (price)...")
    variants = fetch_variants(engine)
    print("Fetching inventory rows...")
    inventory = fetch_inventory(engine)
    print("Fetching reviews (for cumulative ratings)...")
    reviews = fetch_reviews(engine, padded_start, end)

    # The snapshot dates we will materialize (no padding)
    snapshot_dates = pd.date_range(start=start, end=end, freq="D").to_pydatetime().tolist()
    snapshot_strings = [d.strftime("%Y-%m-%d") for d in snapshot_dates]

    all_rows = []
    print("Building feature rows per product x date (this can take some time)...")
    for _, prod in tqdm(products_df.iterrows(), total=len(products_df)):
        pid = prod["id"]
        sid = prod["storeId"]
        rows = build_rows_for_product(pid, sid, snapshot_strings, prod_stats, store_stats, variants, inventory, reviews)
        all_rows.extend(rows)

    df_out = pd.DataFrame(all_rows)
    if df_out.empty:
        print("No rows generated.")
    else:
        # ensure consistent column ordering
        cols = [
            "productId", "storeId", "snapshot_date",
            "sales_7d","sales_14d","sales_30d","sales_7d_per_day","sales_30d_per_day","sales_ratio_7_30",
            "views_7d","views_30d","addToCarts_7d","view_to_purchase_7d",
            "avg_price","min_price","max_price",
            "avg_rating","rating_count",
            "inventory_qty","days_since_restock",
            "store_views_7d","store_purchases_7d",
            "day_of_week","is_weekend",
            "future_sales_14d","stockout_14d"
        ]
        # add missing cols if any (defensive)
        for c in cols:
            if c not in df_out.columns:
                df_out[c] = 0
        df_out = df_out[cols]
        df_out.to_csv(out_csv, index=False)
        print(f"Wrote {len(df_out)} rows to {out_csv}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--start", required=True, help="Start date YYYY-MM-DD")
    p.add_argument("--end", required=True, help="End date YYYY-MM-DD")
    p.add_argument("--out", default="data/features.csv", help="Output CSV path")
    p.add_argument("--products", nargs="*", help="Optional product ids filter")
    args = p.parse_args()
    export_features_cli(args.start, args.end, args.out, args.products)


if __name__ == "__main__":
    main()
