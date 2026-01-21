"""
CSV-first KNN map visualization script.
Usage examples:
  python ml-scripts/knn_map_viz_fixed.py --csv ml-output/property_recommendations.csv --k 5 --radius_km 5
  python ml-scripts/knn_map_viz_fixed.py --mongo-uri <URI> --db rentify --collection properties --k 5

This script prefers `--csv` when provided and falls back to the default CSV in `ml-output`.
Generates `ml-output/knn_nearby.csv`, `ml-output/knn_nearby.html`, `ml-output/knn_great_deals.csv`, and `ml-output/knn_great_deals.html`.
"""
from __future__ import annotations

import argparse
import math
import re
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
import plotly.express as px
import plotly.graph_objects as go

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_CSV = PROJECT_ROOT / "ml-output" / "property_recommendations.csv"
OUT_DIR = PROJECT_ROOT / "ml-output"

# Center at Naga College Foundation
CENTER_LAT = 13.6335281
CENTER_LON = 123.1891166


def parse_latlon(address_field: str) -> Tuple[Optional[float], Optional[float]]:
    """Try to extract latitude/longitude from a string field.

    Handles common patterns:
    - stringified dicts: '{"address": "..", "latitude": 13.6, "longitude": 123.1}'
    - single quotes: '{'latitude': 13.6, 'longitude': 123.1}'
    - simple 'lat, lon' pairs
    """
    if not isinstance(address_field, str):
    parser.add_argument('--db', default='rentify')
    parser.add_argument('--collection', default='properties')
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--radius_km', type=float, default=5.0)
    parser.add_argument('--k', type=int, default=5)
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.csv:
        csv_path = Path(args.csv)
        if not csv_path.exists():
            print('CSV not found:', csv_path)
            return
        df = load_csv(csv_path)
    else:
        if DATA_CSV.exists():
            df = load_csv(DATA_CSV)
        else:
            if args.mongo_uri:
                # defer Mongo loader to optional module to avoid heavy dependencies in CSV-only runs
                try:
                    from pymongo import MongoClient

                    client = MongoClient(args.mongo_uri)
                    col = client[args.db][args.collection]
                    cursor = col.find({})
                    if args.limit and args.limit > 0:
                        cursor = cursor.limit(args.limit)
                    docs = list(cursor)
                    if len(docs) == 0:
                        print('No documents found in MongoDB collection')
                        return
                    rows = []
                    for doc in docs:
                        row = dict(doc)
                        rows.append(row)
                    tmp = pd.DataFrame(rows)
                    # write to temp CSV-like DataFrame then reuse loader
                    tmp.to_csv(OUT_DIR / 'knn_tmp_from_mongo.csv', index=False)
                    df = load_csv(OUT_DIR / 'knn_tmp_from_mongo.csv')
                except Exception as e:
                    print('Mongo load failed:', e)
                    return
            else:
                print('No CSV found and no --mongo-uri provided. Place a CSV at', DATA_CSV)
                return

    """
    CSV-first KNN map visualization script.
    Usage examples:
      python ml-scripts/knn_map_viz_fixed.py --csv ml-output/property_recommendations.csv --k 5 --radius_km 5
      python ml-scripts/knn_map_viz_fixed.py --mongo-uri <URI> --db rentify --collection properties --k 5

    This script prefers `--csv` when provided and falls back to the default CSV in `ml-output`.
    Generates `ml-output/knn_nearby.csv`, `ml-output/knn_nearby.html`, `ml-output/knn_great_deals.csv`, and `ml-output/knn_great_deals.html`.
    """
    from __future__ import annotations

    import argparse
    import math
    import re
    from pathlib import Path
    from typing import Optional, Tuple

    import numpy as np
    import pandas as pd
    from sklearn.neighbors import NearestNeighbors
    import plotly.express as px
    import plotly.graph_objects as go

    PROJECT_ROOT = Path(__file__).resolve().parents[1]
    DATA_CSV = PROJECT_ROOT / "ml-output" / "property_recommendations.csv"
    OUT_DIR = PROJECT_ROOT / "ml-output"

    # Center at Naga College Foundation
    CENTER_LAT = 13.6335281
    CENTER_LON = 123.1891166


    def parse_latlon(address_field: str) -> Tuple[Optional[float], Optional[float]]:
        """Try to extract latitude/longitude from a string field.

        Handles common patterns:
        - stringified dicts: '{"address": "..", "latitude": 13.6, "longitude": 123.1}'
        - single quotes: '{'latitude': 13.6, 'longitude': 123.1}'
        - simple 'lat, lon' pairs
        """
        if not isinstance(address_field, str):
            return None, None
        # JSON-like double-quoted keys
        m = re.search(r'"latitude"\s*:\s*([\d\.-]+)', address_field)
        if m:
            try:
                lat = float(m.group(1))
            except Exception:
                lat = None
        else:
            lat = None
        m2 = re.search(r'"longitude"\s*:\s*([\d\.-]+)', address_field)
        if m2:
            try:
                lon = float(m2.group(1))
            except Exception:
                lon = None
        else:
            lon = None

        # single-quoted style
        if lat is None or lon is None:
            m = re.search(r"'latitude'\s*:\s*([\d\.-]+)", address_field)
            m2 = re.search(r"'longitude'\s*:\s*([\d\.-]+)", address_field)
            if m and m2:
                try:
                    lat = float(m.group(1))
                    lon = float(m2.group(1))
                except Exception:
                    lat, lon = lat, lon

        # fallback: simple comma-separated 'lat, lon'
        if lat is None or lon is None:
            m = re.search(r'([\d\.-]+)\s*,\s*([\d\.-]+)', address_field)
            if m:
                try:
                    lat = float(m.group(1))
                    lon = float(m.group(2))
                except Exception:
                    pass

        return lat, lon


    def haversine_km(lat1, lon1, lat2, lon2):
        R = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


    def load_csv(path: Path) -> pd.DataFrame:
        df = pd.read_csv(path)

        # ensure property_name column
        if 'property_name' not in df.columns:
            if 'name' in df.columns:
                df['property_name'] = df['name']
            elif 'title' in df.columns:
                df['property_name'] = df['title']
            else:
                df['property_name'] = df.index.map(lambda i: f"Property {i}")

        # try parsing lat/lon from an 'address' column if present, else use numeric columns
        lats = [None] * len(df)
        lons = [None] * len(df)
        if 'address' in df.columns:
            for i, v in enumerate(df['address'].fillna('').astype(str).values):
                lat, lon = parse_latlon(v)
                lats[i] = lat
                lons[i] = lon

        # fallback to numeric latitude/longitude columns
        if 'latitude' in df.columns:
            existing_lat = pd.to_numeric(df['latitude'], errors='coerce')
            for i in range(len(lats)):
                if lats[i] is None and not np.isnan(existing_lat.iloc[i]):
                    lats[i] = float(existing_lat.iloc[i])
        if 'longitude' in df.columns:
            existing_lon = pd.to_numeric(df['longitude'], errors='coerce')
            for i in range(len(lons)):
                if lons[i] is None and not np.isnan(existing_lon.iloc[i]):
                    lons[i] = float(existing_lon.iloc[i])

        df['latitude'] = lats
        df['longitude'] = lons

        # ensure numeric price and rating
        if 'price' in df.columns:
            df['price'] = pd.to_numeric(df['price'], errors='coerce')
        else:
            df['price'] = np.nan
        if 'rating' in df.columns:
            df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
        else:
            df['rating'] = 0.0

        df = df.dropna(subset=['latitude', 'longitude', 'price']).reset_index(drop=True)
        return df


    def predict_by_neighbors(df: pd.DataFrame, k: int = 5) -> np.ndarray:
        # use geographic proximity (lat, lon) to predict price as mean of neighbors' prices
        n = len(df)
        if n == 0:
            return np.array([])
        features = df[['latitude', 'longitude']].values
        prices = df['price'].values
        kn = min(k + 1, n)
        nn = NearestNeighbors(n_neighbors=kn, algorithm='auto')
        nn.fit(features)
        dists, inds = nn.kneighbors(features)
        preds = np.zeros(n)
        for i, neigh_inds in enumerate(inds):
            # exclude self
            neigh = [idx for idx in neigh_inds if idx != i]
            if len(neigh) > 0:
                preds[i] = float(np.mean(prices[neigh]))
            else:
                preds[i] = float(np.median(prices))
        return preds


    def make_map(df: pd.DataFrame, out_html: Path, title: str, center_lat: float, center_lon: float):
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        if df.shape[0] == 0:
            out_html.write_text(f"<html><body><h3>{title}</h3><p>No properties to display.</p></body></html>", encoding='utf-8')
            return

        fig = px.scatter_mapbox(
            df,
            lat='latitude',
            lon='longitude',
            hover_name='property_name',
            hover_data={'price': True, 'predicted_price': True, 'distance_km': True, 'deal_score': True, 'address': False},
            color='deal_score',
            color_continuous_scale='RdYlGn',
            size=np.clip(df['deal_score'].abs(), 5, 30),
            zoom=13,
            center={'lat': center_lat, 'lon': center_lon},
            height=700,
        )
        fig.update_layout(mapbox_style='open-street-map', title=title)
        fig.add_trace(go.Scattermapbox(lat=[center_lat], lon=[center_lon], mode='markers+text', marker=dict(size=14, color='black'), text=['Center'], textposition='top right', hoverinfo='none'))
        fig.write_html(str(out_html), include_plotlyjs='cdn', full_html=True)


    def main():
        parser = argparse.ArgumentParser()
        parser.add_argument('--csv', help='Path to CSV file with properties (preferred)')
        parser.add_argument('--mongo-uri', help='MongoDB URI to load data (optional)')
        parser.add_argument('--db', default='rentify')
        parser.add_argument('--collection', default='properties')
        parser.add_argument('--limit', type=int, default=0)
        parser.add_argument('--radius_km', type=float, default=5.0)
        parser.add_argument('--k', type=int, default=5)
        args = parser.parse_args()

        OUT_DIR.mkdir(parents=True, exist_ok=True)

        if args.csv:
            csv_path = Path(args.csv)
            if not csv_path.exists():
                print('CSV not found:', csv_path)
                return
            df = load_csv(csv_path)
        else:
            if DATA_CSV.exists():
                df = load_csv(DATA_CSV)
            else:
                if args.mongo_uri:
                    # defer Mongo loader to optional module to avoid heavy dependencies in CSV-only runs
                    try:
                        from pymongo import MongoClient

                        client = MongoClient(args.mongo_uri)
                        col = client[args.db][args.collection]
                        cursor = col.find({})
                        if args.limit and args.limit > 0:
                            cursor = cursor.limit(args.limit)
                        docs = list(cursor)
                        if len(docs) == 0:
                            print('No documents found in MongoDB collection')
                            return
                        rows = []
                        for doc in docs:
                            row = dict(doc)
                            rows.append(row)
                        tmp = pd.DataFrame(rows)
                        # write to temp CSV-like DataFrame then reuse loader
                        tmp.to_csv(OUT_DIR / 'knn_tmp_from_mongo.csv', index=False)
                        df = load_csv(OUT_DIR / 'knn_tmp_from_mongo.csv')
                    except Exception as e:
                        print('Mongo load failed:', e)
                        return
                else:
                    print('No CSV found and no --mongo-uri provided. Place a CSV at', DATA_CSV)
                    return

        if df.shape[0] == 0:
            print('No valid property rows found (need latitude, longitude, price).')
            return

        df = df.reset_index(drop=True)
        df['predicted_price'] = predict_by_neighbors(df, k=args.k)
        df['deal_score'] = (df['predicted_price'] - df['price']) / df['predicted_price'] * 100
        df['distance_km'] = df.apply(lambda r: haversine_km(CENTER_LAT, CENTER_LON, r['latitude'], r['longitude']), axis=1)

        nearby = df[df['distance_km'] <= args.radius_km].copy()
        nearby = nearby.sort_values('distance_km')
        nearby_out_csv = OUT_DIR / 'knn_nearby.csv'
        nearby.to_csv(nearby_out_csv, index=False)
        nearby_html = OUT_DIR / 'knn_nearby.html'
        make_map(nearby, nearby_html, f'Recommended Nearby Properties (within {args.radius_km} km of Naga College Foundation)', CENTER_LAT, CENTER_LON)

        deals = df[df['deal_score'] >= 20.0].copy()
        deals = deals.sort_values('deal_score', ascending=False)
        deals_out_csv = OUT_DIR / 'knn_great_deals.csv'
        deals.to_csv(deals_out_csv, index=False)
        deals_html = OUT_DIR / 'knn_great_deals.html'
        make_map(deals, deals_html, 'Great Deals (predicted price >> listed price)', CENTER_LAT, CENTER_LON)

        print('Wrote:', nearby_out_csv, nearby_html)
        print('Wrote:', deals_out_csv, deals_html)


    if __name__ == '__main__':
        main()
