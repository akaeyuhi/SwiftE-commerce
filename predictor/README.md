# Predictor pipeline (export → train → serve)

Requirements:
- Python 3.10+
- Postgres (for export) with product_daily_stats, store_daily_stats, products, product_variants, inventory, reviews
- Optional: Docker for containerized predictor

Install Python deps:
```bash
pip install -r requirements.txt
