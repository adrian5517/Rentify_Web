"""
Standalone KNN demo and interactive visualization

Usage:
  python ml-scripts/knn_full_viz.py

This script reads `ml-output/property_recommendations.csv`, extracts latitude/longitude
from the `address` field, trains a KNN regressor to predict `price` using geo features
and `rating` if available, and writes:
  - `ml-output/knn_results.csv` (predictions + errors)
  - `ml-output/knn_full_viz.html` (interactive Plotly visualization)

The HTML shows actual vs predicted price; hover a point to see name, price, and location.
"""
from __future__ import annotations

import re
import os
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.neighbors import KNeighborsRegressor
from sklearn.model_selection import train_test_split
import plotly.graph_objects as go
import plotly.express as px
import argparse
from pymongo import MongoClient


DATA_CSV = Path(__file__).resolve().parents[1] / "ml-output" / "property_recommendations.csv"
OUT_HTML = Path(__file__).resolve().parents[1] / "ml-output" / "knn_full_viz.html"
OUT_CSV = Path(__file__).resolve().parents[1] / "ml-output" / "knn_results.csv"


def parse_latlon(address_field: str):
    """Extract latitude and longitude from the address string.
    The address in the CSV is a string of a Python dict, e.g.
    "{'address': '...', 'latitude': 13.62, 'longitude': 123.20}"
    Returns (lat, lon) or (None, None) when not found.
    """
    if not isinstance(address_field, str):
        return None, None
    lat = None
    lon = None
    # Try regex for 'latitude': number
    mlat = re.search(r"'latitude'\s*:\s*([\d\.-]+)", address_field)
    mlon = re.search(r"'longitude'\s*:\s*([\d\.-]+)", address_field)
    if mlat:
        try:
            lat = float(mlat.group(1))
        except Exception:
            lat = None
    if mlon:
        try:
            lon = float(mlon.group(1))
        except Exception:
            lon = None
    return lat, lon


def load_and_prepare(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

    # Normalize columns
    if 'property_name' not in df.columns and 'property' in df.columns:
        df = df.rename(columns={'property': 'property_name'})

    # Parse lat/lon
    lats = []
    lons = []
    for val in df['address'].astype(str).values:
        lat, lon = parse_latlon(val)
        lats.append(lat)
        lons.append(lon)
    df['latitude'] = lats
    df['longitude'] = lons

    # Coerce price
    df['price'] = pd.to_numeric(df['price'], errors='coerce')

    # rating may exist; coerce
    if 'rating' in df.columns:
        df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
    else:
        df['rating'] = 0.0

    # Drop rows without lat/lon or price
    df = df.dropna(subset=['price'])

    return df


def load_and_prepare_from_df(df: pd.DataFrame) -> pd.DataFrame:
    """Accept a raw DataFrame (from Mongo) and normalize it into the same format as CSV loader."""
    # Ensure property_name
    if 'property_name' not in df.columns:
        if 'name' in df.columns:
            df['property_name'] = df['name']
        elif 'title' in df.columns:
            df['property_name'] = df['title']
        else:
            df['property_name'] = df.index.map(lambda i: f"Property {i}")

    # Ensure address
    if 'address' not in df.columns and 'location' in df.columns:
        df['address'] = df['location'].astype(str)

    # If address is a dict-like object, convert to string
    df['address'] = df['address'].astype(str)

    # Parse lat/lon
    lats = []
    lons = []
    for val in df['address'].astype(str).values:
        lat, lon = parse_latlon(val)
        lats.append(lat)
        lons.append(lon)
    df['latitude'] = lats
    df['longitude'] = lons

    # Coerce price
    if 'price' in df.columns:
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
    else:
        df['price'] = np.nan

    # rating
    if 'rating' in df.columns:
        df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
    else:
        df['rating'] = 0.0

    df = df.dropna(subset=['price'])
    return df


def load_from_mongo(uri: str, db_name: str, collection_name: str, limit: int | None = None) -> pd.DataFrame:
    client = MongoClient(uri)
    db = client[db_name]
    col = db[collection_name]
    cursor = col.find({})
    if limit and limit > 0:
        cursor = cursor.limit(limit)
    docs = list(cursor)
    if len(docs) == 0:
        raise RuntimeError(f"No documents found in {db_name}.{collection_name}")
    df = pd.DataFrame(docs)
    return df


def train_knn(df: pd.DataFrame, n_neighbors: int = 5):
    features = ['latitude', 'longitude', 'rating']
    X = df[features].fillna(0.0).values
    y = df['price'].values

    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, df.index.values, test_size=0.25, random_state=42
    )

    model = KNeighborsRegressor(n_neighbors=n_neighbors)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    results = df.loc[idx_test].copy()
    results = results.reset_index(drop=True)
    results['predicted_price'] = y_pred
    results['actual_price'] = y_test
    results['error_percent'] = (np.abs(results['actual_price'] - results['predicted_price']) / results['actual_price']) * 100

    return model, results


def make_plot(results: pd.DataFrame, out_html: Path):
    # Scatter: actual (x) vs predicted (y)
    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=results['actual_price'],
            y=results['predicted_price'],
            mode='markers',
            marker=dict(
                size=10,
                color=results['error_percent'],
                colorscale='Turbo',
                colorbar=dict(title='Error %'),
                showscale=True
            ),
            hovertemplate=(
                '<b>%{customdata[0]}</b><br>'
                'Actual: ₱%{x:,.0f}<br>'
                'Predicted: ₱%{y:,.0f}<br>'
                'Error: %{marker.color:.1f}%<br>'
                'Address: %{customdata[1]}<br>'
                'Lat: %{customdata[2]:.6f}, Lon: %{customdata[3]:.6f}<extra></extra>'
            ),
            customdata=np.stack(
                [
                    results.get('property_name', results.index).astype(str),
                    results['address'].astype(str),
                    results['latitude'].fillna(0.0).astype(float),
                    results['longitude'].fillna(0.0).astype(float),
                ],
                axis=1,
            ),
        )
    )

    # Add y=x line
    minv = min(results['actual_price'].min(), results['predicted_price'].min())
    maxv = max(results['actual_price'].max(), results['predicted_price'].max())
    fig.add_trace(go.Scatter(x=[minv, maxv], y=[minv, maxv], mode='lines', line=dict(dash='dash', color='black'), name='y = x'))

    fig.update_layout(
        title='KNN: Actual vs Predicted Price (interactive) ',
        xaxis_title='Actual Price (PHP)',
        yaxis_title='Predicted Price (PHP)',
        template='plotly_white',
        height=800,
    )

    # Add a simple table of top errors
    top_errors = results.sort_values('error_percent', ascending=False).head(8)
    table = go.Table(
        header=dict(values=['Property', 'Actual', 'Predicted', 'Error %', 'Address'], fill_color='#E8EEF2'),
        cells=dict(values=[
            top_errors.get('property_name', top_errors.index).astype(str),
            top_errors['actual_price'].map(lambda v: f'₱{v:,.0f}'),
            top_errors['predicted_price'].map(lambda v: f'₱{v:,.0f}'),
            top_errors['error_percent'].map(lambda v: f'{v:.1f}%'),
            top_errors['address'].astype(str),
        ], fill_color='#F7FBFC')
    )

    # place table below by using subplots via domain
    from plotly.subplots import make_subplots

    fig2 = make_subplots(rows=2, cols=1, row_heights=[0.7, 0.3], vertical_spacing=0.06, specs=[[{"type": "scatter"}], [{"type": "table"}]])
    # scatter trace
    for t in fig.data:
        fig2.add_trace(t, row=1, col=1)
    fig2.add_trace(table, row=2, col=1)

    fig2.update_layout(title_text='KNN: Actual vs Predicted (with top errors table)', height=900, template='plotly_white')

    fig2.write_html(str(out_html), include_plotlyjs='cdn', full_html=True)


def main():
    parser = argparse.ArgumentParser(description='KNN full viz - use CSV or MongoDB as source')
    parser.add_argument('--mongo-uri', help='MongoDB connection string (mongodb+srv://...)')
    parser.add_argument('--db', help='MongoDB database name', default='rentify')
    parser.add_argument('--collection', help='MongoDB collection name', default='properties')
    parser.add_argument('--limit', type=int, help='Limit number of documents to load from DB', default=0)
    parser.add_argument('--k', type=int, help='Neighbors for KNN', default=5)
    args = parser.parse_args()

    if args.mongo_uri:
        print('Loading data from MongoDB...')
        raw = load_from_mongo(args.mongo_uri, args.db, args.collection, limit=(args.limit or None))
        df = load_and_prepare_from_df(raw)
    else:
        if not DATA_CSV.exists():
            print(f"Data not found: {DATA_CSV}")
            return
        df = load_and_prepare(DATA_CSV)

    model, results = train_knn(df, n_neighbors=args.k)

    # Save results
    results.to_csv(OUT_CSV, index=False)
    print(f"Saved results to {OUT_CSV}")

    # Write interactive HTML
    make_plot(results, OUT_HTML)
    print(f"Saved interactive visualization to {OUT_HTML}")


if __name__ == '__main__':
    main()
