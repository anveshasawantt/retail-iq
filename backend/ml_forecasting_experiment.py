"""
RetailIQ Offline ML Demand Forecasting Experiment
-------------------------------------------------
1. Data Audit of PostgreSQL Transaction History
2. Product-Day Aggregation & Time-Series Feature Engineering
3. Time-Based Train/Validation Split (No Shuffling)
4. Baseline Evaluation (Rolling 7-Day Sales Velocity)
5. XGBoost Model Training & Evaluation
6. Baseline vs XGBoost Comparison (MAE, RMSE, WAPE)
"""

import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found in environment")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)

def run_data_audit():
    print("=" * 60)
    print("STEP 1 — DATA AUDIT OF POSTGRESQL TRANSACTIONS")
    print("=" * 60)
    
    query = """
    SELECT 
        ti.id AS item_id,
        ti.transaction_id,
        ti.product_id,
        ti.quantity,
        ti.unit_price,
        ti.line_total,
        t.invoice_number,
        t.created_at,
        p.barcode,
        p.name AS product_name,
        p.category,
        p.min_safety_stock,
        p.lead_time_days
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    JOIN products p ON ti.product_id = p.id
    ORDER BY t.created_at ASC
    """
    df = pd.read_sql(query, engine)
    
    total_items = len(df)
    total_txns = df['transaction_id'].nunique()
    unique_products = df['product_id'].nunique()
    
    min_date = df['created_at'].min()
    max_date = df['created_at'].max()
    span_days = (max_date - min_date).days if pd.notnull(min_date) and pd.notnull(max_date) else 0
    
    # Missing values & null checks
    missing_vals = df.isnull().sum().to_dict()
    duplicates = df.duplicated(subset=['transaction_id', 'product_id']).sum()
    
    # Products catalog query
    total_catalog_products = pd.read_sql("SELECT COUNT(*) FROM products", engine).iloc[0, 0]
    
    print(f"Total Transactions Recorded : {total_txns:,}")
    print(f"Total Line Items Recorded  : {total_items:,}")
    print(f"Total Catalog Products     : {total_catalog_products:,}")
    print(f"Products with Sales History: {unique_products:,}")
    print(f"Earliest Transaction Date  : {min_date}")
    print(f"Latest Transaction Date    : {max_date}")
    print(f"Historical Span (Days)     : {span_days} days")
    print(f"Duplicate Items Detected   : {duplicates}")
    print(f"Missing Value Counts       : {missing_vals}")
    
    return df, span_days

def create_forecasting_dataset(df_raw):
    print("\n" + "=" * 60)
    print("STEP 2 — CREATE FORECASTING DATASET & TIME-SERIES FEATURES")
    print("=" * 60)
    
    # Extract date part
    df = df_raw.copy()
    df['date'] = pd.to_datetime(df['created_at']).dt.date
    
    # Aggregate to Product-Day level
    daily_sales = df.groupby(['date', 'product_id']).agg(
        units_sold=('quantity', 'sum'),
        revenue=('line_total', 'sum')
    ).reset_index()
    
    # Expand full grid of (Date x Product) to preserve time-series continuity
    all_dates = pd.date_range(start=daily_sales['date'].min(), end=daily_sales['date'].max(), freq='D').date
    all_products = df['product_id'].unique()

    grid = pd.MultiIndex.from_product([all_dates, all_products], names=['date', 'product_id']).to_frame().reset_index(drop=True)
    
    full_df = pd.merge(grid, daily_sales, on=['date', 'product_id'], how='left')
    full_df['units_sold'] = full_df['units_sold'].fillna(0).astype(int)
    full_df['revenue'] = full_df['revenue'].fillna(0.0)
    
    # Merge product metadata
    prod_meta = df[['product_id', 'product_name', 'category', 'min_safety_stock', 'lead_time_days']].drop_duplicates('product_id')
    full_df = pd.merge(full_df, prod_meta, on='product_id', how='left')
    
    # Sort strictly by product_id and date for feature engineering
    full_df['date'] = pd.to_datetime(full_df['date'])
    full_df = full_df.sort_values(['product_id', 'date']).reset_index(drop=True)
    
    # Time-series features per product (strictly without target leakage!)
    full_df['lag_1'] = full_df.groupby('product_id')['units_sold'].shift(1)
    full_df['lag_7'] = full_df.groupby('product_id')['units_sold'].shift(7)
    
    full_df['rolling_mean_7'] = full_df.groupby('product_id')['units_sold'].shift(1).rolling(7, min_periods=3).mean()
    full_df['rolling_mean_14'] = full_df.groupby('product_id')['units_sold'].shift(1).rolling(14, min_periods=7).mean()
    full_df['rolling_mean_30'] = full_df.groupby('product_id')['units_sold'].shift(1).rolling(30, min_periods=14).mean()
    
    full_df['day_of_week'] = full_df['date'].dt.dayofweek
    full_df['is_weekend'] = full_df['day_of_week'].apply(lambda d: 1 if d >= 5 else 0)
    full_df['recent_demand_trend'] = full_df['rolling_mean_7'] / (full_df['rolling_mean_30'] + 1e-5)
    
    # Drop rows where lag_14 / rolling_mean_14 is NaN due to warm-up period
    clean_df = full_df.dropna(subset=['rolling_mean_14']).reset_index(drop=True)
    
    print(f"Raw Transaction Line Items   : {len(df_raw):,}")
    print(f"Product-Day Grid Rows        : {len(full_df):,}")
    print(f"Clean Feature Dataset Rows   : {len(clean_df):,}")
    print(f"Date Range after Warm-up     : {clean_df['date'].min().strftime('%Y-%m-%d')} to {clean_df['date'].max().strftime('%Y-%m-%d')}")
    
    return clean_df

def time_series_train_val_split(df):
    print("\n" + "=" * 60)
    print("STEP 3 — TIME-BASED TRAIN / VALIDATION SPLIT")
    print("=" * 60)
    
    unique_dates = sorted(df['date'].unique())
    n_dates = len(unique_dates)
    
    split_idx = int(n_dates * 0.75)  # 75% train, 25% test
    train_dates = unique_dates[:split_idx]
    test_dates = unique_dates[split_idx:]
    
    train_df = df[df['date'].isin(train_dates)].reset_index(drop=True)
    test_df = df[df['date'].isin(test_dates)].reset_index(drop=True)
    
    print(f"Total Evaluation Days : {n_dates}")
    print(f"Train Period          : {train_dates[0].strftime('%Y-%m-%d')} to {train_dates[-1].strftime('%Y-%m-%d')} ({len(train_dates)} days, {len(train_df):,} rows)")
    print(f"Test/Validation Period: {test_dates[0].strftime('%Y-%m-%d')} to {test_dates[-1].strftime('%Y-%m-%d')} ({len(test_dates)} days, {len(test_df):,} rows)")
    print(f"Validation Strategy   : Strict Time-Series Split (Zero Shuffling)")
    
    return train_df, test_df

def calculate_metrics(y_true, y_pred):
    mae = np.mean(np.abs(y_true - y_pred))
    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
    wape = (np.sum(np.abs(y_true - y_pred)) / np.sum(np.abs(y_true))) * 100.0 if np.sum(np.abs(y_true)) > 0 else 0.0
    return {"MAE": round(mae, 4), "RMSE": round(rmse, 4), "WAPE": round(wape, 2)}

def evaluate_models(train_df, test_df):
    import xgboost as xgb
    
    print("\n" + "=" * 60)
    print("STEP 4 & 5 — BASELINE vs XGBoost FORECAST EVALUATION")
    print("=" * 60)
    
    # ----------------------------------------------------
    # Baseline: Rolling 7-Day Sales Velocity (rolling_mean_7)
    # ----------------------------------------------------
    baseline_pred = test_df['rolling_mean_7'].fillna(0).values
    y_test = test_df['units_sold'].values
    
    baseline_metrics = calculate_metrics(y_test, baseline_pred)
    
    # ----------------------------------------------------
    # XGBoost Demand Forecasting Model
    # ----------------------------------------------------
    feature_cols = [
        'lag_1', 'lag_7',
        'rolling_mean_7', 'rolling_mean_14', 'rolling_mean_30',
        'day_of_week', 'is_weekend', 'recent_demand_trend',
        'min_safety_stock', 'lead_time_days'
    ]
    
    X_train = train_df[feature_cols].fillna(0)
    y_train = train_df['units_sold']
    
    X_test = test_df[feature_cols].fillna(0)
    
    model = xgb.XGBRegressor(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.04,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    xgb_pred = model.predict(X_test)
    xgb_pred = np.clip(xgb_pred, 0, None)  # demand cannot be negative
    
    xgb_metrics = calculate_metrics(y_test, xgb_pred)
    
    print("\nMODEL PERFORMANCE COMPARISON (TEST PERIOD):")
    print("-" * 55)
    print(f"{'Metric':<10} | {'Baseline (Velocity)':<20} | {'XGBoost Model':<15}")
    print("-" * 55)
    print(f"{'MAE':<10} | {baseline_metrics['MAE']:<20} | {xgb_metrics['MAE']:<15}")
    print(f"{'RMSE':<10} | {baseline_metrics['RMSE']:<20} | {xgb_metrics['RMSE']:<15}")
    print(f"{'WAPE (%)':<10} | {baseline_metrics['WAPE']:<20}% | {xgb_metrics['WAPE']:<15}%")
    print("-" * 55)
    
    # Feature Importance
    importances = model.feature_importances_
    feat_imp = pd.DataFrame({'feature': feature_cols, 'importance': importances}).sort_values('importance', ascending=False)
    print("\nXGBOOST FEATURE IMPORTANCE:")
    print(feat_imp.to_string(index=False))

    # ----------------------------------------------------
    # Save Final Trained Model & Metadata to backend/app/ml_model.joblib
    # ----------------------------------------------------
    import joblib
    final_model = xgb.XGBRegressor(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.04,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    X_full = pd.concat([train_df[feature_cols], test_df[feature_cols]]).fillna(0)
    y_full = pd.concat([train_df['units_sold'], test_df['units_sold']])
    final_model.fit(X_full, y_full)

    model_path = os.path.join(os.path.dirname(__file__), "app", "ml_model.joblib")
    joblib.dump({
        "model": final_model,
        "feature_cols": feature_cols,
        "target": "daily_units_sold",
        "horizon": "next_1_day_demand",
        "saved_at": datetime.now().isoformat()
    }, model_path)
    print(f"\nSuccessfully exported trained XGBoost model to: {model_path}")
    
    return baseline_metrics, xgb_metrics, feat_imp

if __name__ == "__main__":
    df_raw, span_days = run_data_audit()
    clean_df = create_forecasting_dataset(df_raw)
    train_df, test_df = time_series_train_val_split(clean_df)
    baseline_metrics, xgb_metrics, feat_imp = evaluate_models(train_df, test_df)

