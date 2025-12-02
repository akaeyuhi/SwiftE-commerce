
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def expand_dataset(input_file, output_file, target_rows=400000, num_stores=20, num_products=50):
    """
    Expand a small synthetic dataset to a larger dataset by:
    1. Extending the date range (multiple years)
    2. Adding more stores
    3. Adding more products
    4. Adding realistic variations
    """

    print(f"Loading dataset from {input_file}...")
    df_original = pd.read_csv(input_file)

    # Parse date
    df_original['date'] = pd.to_datetime(df_original['date'])

    # Get original parameters
    orig_products = sorted(df_original['productId'].unique().tolist())
    orig_stores = sorted(df_original['storeId'].unique().tolist())
    date_min = df_original['date'].min()
    date_max = df_original['date'].max()
    days_in_original = (date_max - date_min).days

    print(f"Original: {len(df_original)} rows, {len(orig_products)} products, {len(orig_stores)} stores")
    print(f"Original date range: {days_in_original} days")

    # Calculate how many years we need to cover
    records_per_day_per_combo = len(df_original) / (days_in_original + 1) / len(orig_products) / len(orig_stores)
    combos_needed = target_rows / (days_in_original + 1) / records_per_day_per_combo

    # Create new store and product lists
    new_stores = [f'store_{i}' for i in range(1, num_stores + 1)]
    new_products = [f'product_{chr(65 + i)}' for i in range(num_products)]  # A, B, C, ...

    print(f"Target: {num_stores} stores × {num_products} products = {num_stores * num_products} combinations")

    # Set random seed for reproducibility
    np.random.seed(42)

    # Create expanded dataset
    expanded_data = []

    for store_idx, store_id in enumerate(new_stores):
        for prod_idx, product_id in enumerate(new_products):
            # Get a base row to replicate
            if prod_idx < len(orig_products):
                base_row = df_original[df_original['productId'] == orig_products[prod_idx]].iloc[0].to_dict()
            else:
                base_row = df_original.iloc[prod_idx % len(df_original)].to_dict()

            # Generate dates (3 years of data)
            start_date = datetime(2022, 1, 1)
            end_date = datetime(2024, 12, 31)
            num_days = (end_date - start_date).days

            current_date = start_date
            time_idx = 0

            while current_date <= end_date:
                # Calculate features based on date and product
                dow = current_date.weekday()
                dom = current_date.day
                month = current_date.month
                is_weekend = 1.0 if dow >= 5 else 0.0

                # Base demand varies by store and product
                base_demand = 20 + (store_idx % 10) * 2 + (prod_idx % 5) * 3

                # Weekly seasonality
                weekly_factor = 1.0 + 0.3 * np.sin(2 * np.pi * dow / 7)

                # Yearly seasonality
                day_of_year = current_date.timetuple().tm_yday
                yearly_factor = 1.0 + 0.2 * np.sin(2 * np.pi * day_of_year / 365)

                # Trend
                trend = (time_idx / num_days) * 0.1

                # Generate purchases with noise
                purchases = base_demand * (1 + trend) * weekly_factor * yearly_factor
                purchases = max(0, purchases + np.random.normal(0, base_demand * 0.15))

                # Correlated features
                views = purchases * np.random.uniform(0.8, 1.5) + np.random.normal(0, 3)
                views = max(0, views)

                price = 15 + (store_idx % 5) * 2
                revenue = purchases * price + np.random.normal(0, price * 1.5)
                revenue = max(0, revenue)

                inventory_qty = purchases * np.random.uniform(1.5, 3.5) + np.random.normal(0, 5)
                inventory_qty = max(0, inventory_qty)

                # Log transforms
                log_purchases = np.log1p(purchases)
                log_views = np.log1p(views)

                expanded_data.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'productId': product_id,
                    'storeId': store_id,
                    'purchases': round(purchases, 2),
                    'views': round(views, 2),
                    'revenue': round(revenue, 2),
                    'inventoryQty': round(inventory_qty, 2),
                    'timeidx': time_idx,
                    'dayOfWeek': dow,
                    'dayOfMonth': dom,
                    'month': month,
                    'isWeekend': is_weekend,
                    'logpurchases': round(log_purchases, 8),
                    'logviews': round(log_views, 8)
                })

                current_date += timedelta(days=1)
                time_idx += 1

                # Show progress
                total_records = len(expanded_data)
                if total_records % 100000 == 0:
                    print(f"Generated {total_records:,} records...")

    # Create DataFrame
    df_expanded = pd.DataFrame(expanded_data)

    print(f"\nExpanded dataset created!")
    print(f"Total records: {len(df_expanded):,}")
    print(f"Date range: {df_expanded['date'].min()} to {df_expanded['date'].max()}")
    print(f"Unique stores: {df_expanded['storeId'].nunique()}")
    print(f"Unique products: {df_expanded['productId'].nunique()}")
    print(f"Total combinations: {df_expanded['storeId'].nunique() * df_expanded['productId'].nunique()}")

    # Save to CSV
    print(f"\nSaving to {output_file}...")
    df_expanded.to_csv(output_file, index=False)
    print(f"✓ Dataset saved!")

    # Print statistics
    print(f"\nDataset Statistics:")
    print(f"Purchases - Mean: {df_expanded['purchases'].mean():.2f}, Std: {df_expanded['purchases'].std():.2f}")
    print(f"Views     - Mean: {df_expanded['views'].mean():.2f}, Std: {df_expanded['views'].std():.2f}")
    print(f"Revenue   - Mean: {df_expanded['revenue'].mean():.2f}, Std: {df_expanded['revenue'].std():.2f}")
    print(f"Inventory - Mean: {df_expanded['inventoryQty'].mean():.2f}, Std: {df_expanded['inventoryQty'].std():.2f}")

    return df_expanded

# Run the expansion
if __name__ == '__main__':
    # Expand to approximately 400,000 rows
    df_expanded = expand_dataset(
        input_file='./data/synthetic_train(small).csv',
        output_file='./data/synthetic_train_expanded.csv',
        target_rows=400000,
        num_stores=20,
        num_products=50
    )

    print("\n✓ Expansion complete!")
