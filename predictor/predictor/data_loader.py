"""
Data loading utilities with optimized queries and error handling
"""
from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Optional
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from .config import featureConfig

logger = logging.getLogger(__name__)


class DataLoader:
    """Efficient data loading with connection pooling and caching"""

    def __init__(self, engine: Engine):
        self.engine = engine

    def loadProducts(self, productIds: Optional[list[str]] = None) -> pd.DataFrame:
        """Load products with optional filtering"""
        query = text("""
            SELECT
                id::text as id,
                "storeId"::text as "storeId"
            FROM products
            WHERE (:filter IS NULL OR id = ANY(:productIds))
        """)

        params = {
            "filter": productIds is not None,
            "productIds": productIds or []
        }

        try:
            df = pd.read_sql_query(query, self.engine, params=params)
            logger.info(f"Loaded {len(df)} products")
            return df
        except Exception as e:
            logger.error(f"Failed to load products: {e}")
            raise

    def loadProductDailyStats(
        self,
        startDate: str,
        endDate: str,
        productIds: Optional[list[str]] = None
    ) -> pd.DataFrame:
        """Load product daily stats with optimized query"""
        query = text("""
            SELECT
                "productId"::text as "productId",
                date::date as date,
                COALESCE(views, 0)::bigint as views,
                COALESCE(purchases, 0)::bigint as purchases,
                COALESCE("addToCarts", 0)::bigint as "addToCarts",
                COALESCE(revenue, 0)::numeric as revenue
            FROM product_daily_stats
            WHERE date BETWEEN :startDate AND :endDate
                AND (:filter IS NULL OR "productId" = ANY(:productIds))
            ORDER BY "productId", date
        """)

        params = {
            "startDate": startDate,
            "endDate": endDate,
            "filter": productIds is not None,
            "productIds": productIds or []
        }

        try:
            df = pd.read_sql_query(query, self.engine, params=params)
            df['date'] = pd.to_datetime(df['date'])
            logger.info(f"Loaded {len(df)} product daily stats rows")
            return df
        except Exception as e:
            logger.error(f"Failed to load product stats: {e}")
            raise

    def loadStoreDailyStats(
        self,
        startDate: str,
        endDate: str,
        storeIds: Optional[list[str]] = None
    ) -> pd.DataFrame:
        """Load store daily stats"""
        query = text("""
            SELECT
                "storeId"::text as "storeId",
                date::date as date,
                COALESCE(views, 0)::bigint as views,
                COALESCE(purchases, 0)::bigint as purchases,
                COALESCE("addToCarts", 0)::bigint as "addToCarts",
                COALESCE(revenue, 0)::numeric as revenue,
                COALESCE(checkouts, 0)::bigint as checkouts
            FROM store_daily_stats
            WHERE date BETWEEN :startDate AND :endDate
                AND (:filter IS NULL OR "storeId" = ANY(:storeIds))
            ORDER BY "storeId", date
        """)

        params = {
            "startDate": startDate,
            "endDate": endDate,
            "filter": storeIds is not None,
            "storeIds": storeIds or []
        }

        try:
            df = pd.read_sql_query(query, self.engine, params=params)
            df['date'] = pd.to_datetime(df['date'])
            logger.info(f"Loaded {len(df)} store daily stats rows")
            return df
        except Exception as e:
            logger.error(f"Failed to load store stats: {e}")
            raise

    def loadVariants(
        self,
        productIds: Optional[list[str]] = None
    ) -> pd.DataFrame:
        """Load product variants with prices"""
        query = text("""
            SELECT
                id::text as id,
                product::text as "productId",
                COALESCE(price, 0)::numeric as price
            FROM product_variants
            WHERE (:filter IS NULL OR product = ANY(:productIds))
        """)

        params = {
            "filter": productIds is not None,
            "productIds": productIds or []
        }

        try:
            df = pd.read_sql_query(query, self.engine, params=params)
            logger.info(f"Loaded {len(df)} variants")
            return df
        except Exception as e:
            logger.error(f"Failed to load variants: {e}")
            raise

    def loadInventory(
        self,
        variantIds: Optional[list[str]] = None
    ) -> pd.DataFrame:
        """Load inventory history"""
        query = text("""
            SELECT
                id::text as id,
                variant::text as "variantId",
                COALESCE(quantity, 0)::bigint as quantity,
                "updatedAt" AT TIME ZONE 'UTC' as "updatedAt"
            FROM inventory
            WHERE (:filter IS NULL OR variant = ANY(:variantIds))
            ORDER BY variant, "updatedAt"
        """)

        params = {
            "filter": variantIds is not None,
            "variantIds": variantIds or []
        }

        try:
            df = pd.read_sql_query(query, self.engine, params=params)
            if not df.empty:
                df['updatedAt'] = pd.to_datetime(df['updatedAt'])
            logger.info(f"Loaded {len(df)} inventory records")
            return df
        except Exception as e:
            logger.error(f"Failed to load inventory: {e}")
            raise

    def loadReviews(
        self,
        startDate: str,
        endDate: str,
        productIds: Optional[list[str]] = None
    ) -> pd.DataFrame:
        """Load reviews for rating computation"""
        # Load extra year of history for stable ratings
        query = text("""
            SELECT
                id::text as id,
                "productId"::text as "productId",
                rating::int as rating,
                "createdAt" AT TIME ZONE 'UTC' as "createdAt"
            FROM reviews
            WHERE "createdAt" BETWEEN
                  (:startDate::date - INTERVAL '365 days') AND
                  (:endDate::date + INTERVAL '30 days')
                AND (:filter IS NULL OR "productId" = ANY(:productIds))
            ORDER BY "productId", "createdAt"
        """)

        params = {
            "startDate": startDate,
            "endDate": endDate,
            "filter": productIds is not None,
            "productIds": productIds or []
        }

        try:
            df = pd.read_sql_query(query, self.engine, params=params)
            if not df.empty:
                df['createdAt'] = pd.to_datetime(df['createdAt'])
                df['reviewDate'] = df['createdAt'].dt.date
            logger.info(f"Loaded {len(df)} reviews")
            return df
        except Exception as e:
            logger.error(f"Failed to load reviews: {e}")
            raise


def getDateRangeWithPadding(
    startDate: str,
    endDate: str,
    paddingDays: int = None
) -> tuple[str, str]:
    """Get date range with padding for rolling windows"""
    if paddingDays is None:
        paddingDays = featureConfig.paddingDays

    start = datetime.strptime(startDate, "%Y-%m-%d") - timedelta(days=paddingDays)
    return start.strftime("%Y-%m-%d"), endDate
