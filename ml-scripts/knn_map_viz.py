"""
Map visualization for KNN-based recommendations

Creates:
- ml-output/knn_nearby.html         (map centered at Naga College Foundation showing nearby recommendations)
- ml-output/knn_great_deals.html    (map and table of 'great deals')
- ml-output/knn_nearby.csv
- ml-output/knn_great_deals.csv

Usage:
if __name__ == '__main__':
    main()
Center coordinates default to Naga College Foundation: (13.6335281, 123.1891166)
"""
from __future__ import annotations

import argparse
import math
import re
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
import plotly.express as px
import plotly.graph_objects as go
# No MongoDB dependency for CSV-only mode


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_CSV = PROJECT_ROOT / "ml-output" / "property_recommendations.csv"
OUT_DIR = PROJECT_ROOT / "ml-output"


CENTER_LAT = 13.6335281
CENTER_LON = 123.1891166


def parse_latlon(address_field: str):
    if not isinstance(address_field, str):
        return None, None
    mlat = re.search(r"'latitude'\s*:\s*([\d\.-]+)", address_field)
    mlon = re.search(r"'longitude'\s*:\s*([\d\.-]+)", address_field)
    lat = float(mlat.group(1)) if mlat else None
    lon = float(mlon.group(1)) if mlon else None
    return lat, lon


def haversine_km(lat1, lon1, lat2, lon2):
    # returns distance in kilometers
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def load_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    if 'property_name' not in df.columns and 'property' in df.columns:
        df = df.rename(columns={'property': 'property_name'})
    lats = []
    lons = []
    for v in df['address'].astype(str).values:
        lat, lon = parse_latlon(v)
        lats.append(lat)
        lons.append(lon)
    df['latitude'] = lats
    df['longitude'] = lons
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    if 'rating' in df.columns:
        df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
    else:
        df['rating'] = 0.0
    df = df.dropna(subset=['latitude', 'longitude', 'price'])
    return df


# CSV-only mode: use `load_csv` below. The script accepts `--csv` to point to the CSV file.


def predict_by_neighbors(df: pd.DataFrame, k: int = 5) -> np.ndarray:
    features = df[['latitude', 'longitude', 'rating']].fillna(0.0).values
    prices = df['price'].values
    nn = NearestNeighbors(n_neighbors=min(k+1, len(df)), algorithm='auto')
    nn.fit(features)
    dists, inds = nn.kneighbors(features)
    preds = []
    for i, neighbors in enumerate(inds):
        neigh = [n for n in neighbors if n != i]
        if len(neigh) == 0:
            preds.append(np.median(prices))
        else:
            preds.append(np.mean(prices[neigh]))
    return np.array(preds)


def make_map(df: pd.DataFrame, out_html: Path, title: str, center_lat: float, center_lon: float):
    if df.shape[0] == 0:
        # create a minimal HTML informing no data
        html = f"<html><body><h3>{title}</h3><p>No properties to display.</p></body></html>"
        out_html.write_text(html, encoding='utf-8')
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
    parser.add_argument('--mongo-uri', help='MongoDB URI to load data (optional)')
    parser.add_argument('--db', default='rentify')
    parser.add_argument('--collection', default='properties')
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--radius_km', type=float, default=5.0)
    parser.add_argument('--k', type=int, default=5)
    args = parser.parse_args()

    if args.mongo_uri:
        df = load_from_mongo(args.mongo_uri, args.db, args.collection, limit=(args.limit or None))
    else:
        if not DATA_CSV.exists():
            print('No data found. Please provide --mongo-uri or ensure property_recommendations.csv exists.')
            return
        df = load_csv(DATA_CSV)

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
"""
Map visualization for KNN-based recommendations

Creates:
- ml-output/knn_nearby.html         (map centered at Naga College Foundation showing nearby recommendations)
- ml-output/knn_great_deals.html    (map and table of 'great deals')
- ml-output/knn_nearby.csv
- ml-output/knn_great_deals.csv

Usage:
  python knn_map_viz.py [--mongo-uri URI --db DB --collection COL] [--radius_km 5] [--k 5]

Center coordinates default to Naga College Foundation: (13.6335281, 123.1891166)
"""
from __future__ import annotations

import argparse
import math
import re
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
import plotly.express as px
import plotly.graph_objects as go
from pymongo import MongoClient


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_CSV = PROJECT_ROOT / "ml-output" / "property_recommendations.csv"
OUT_DIR = PROJECT_ROOT / "ml-output"


CENTER_LAT = 13.6335281
CENTER_LON = 123.1891166


def parse_latlon(address_field: str):
    if not isinstance(address_field, str):
        return None, None
    mlat = re.search(r"'latitude'\s*:\s*([\d\.-]+)", address_field)
    mlon = re.search(r"'longitude'\s*:\s*([\d\.-]+)", address_field)
    lat = float(mlat.group(1)) if mlat else None
    lon = float(mlon.group(1)) if mlon else None
    return lat, lon


def haversine_km(lat1, lon1, lat2, lon2):
    # returns distance in kilometers
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def load_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    if 'property_name' not in df.columns and 'property' in df.columns:
        df = df.rename(columns={'property': 'property_name'})
    lats = []
    lons = []
    for v in df['address'].astype(str).values:
        lat, lon = parse_latlon(v)
        lats.append(lat)
        lons.append(lon)
    df['latitude'] = lats
    df['longitude'] = lons
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    if 'rating' in df.columns:
        df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
    else:
        df['rating'] = 0.0
    df = df.dropna(subset=['latitude', 'longitude', 'price'])
    return df


def load_from_mongo(uri: str, db: str, collection: str, limit: int | None = None) -> pd.DataFrame:
    client = MongoClient(uri)
    col = client[db][collection]
    cursor = col.find({})
    if limit and limit > 0:
        cursor = cursor.limit(limit)
    docs = list(cursor)
    df = pd.DataFrame(docs)
    # ensure address exists
    if 'address' not in df.columns and 'location' in df.columns:
        df['address'] = df['location'].astype(str)
    if 'property_name' not in df.columns:
        if 'name' in df.columns:
            df['property_name'] = df['name']
        elif 'title' in df.columns:
            df['property_name'] = df['title']
        else:
            df['property_name'] = df.index.map(lambda i: f"Property {i}")
    df['address'] = df['address'].astype(str)
    lats = []
    lons = []
    for v in df['address'].astype(str).values:
        lat, lon = parse_latlon(v)
        lats.append(lat)
        lons.append(lon)
    df['latitude'] = lats
    df['longitude'] = lons
    if 'price' in df.columns:
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
    else:
        df['price'] = np.nan
    if 'rating' in df.columns:
        df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
    else:
        df['rating'] = 0.0
    df = df.dropna(subset=['latitude', 'longitude', 'price'])
    return df


def predict_by_neighbors(df: pd.DataFrame, k: int = 5) -> np.ndarray:
    # Use latitude, longitude, rating as features
    features = df[['latitude', 'longitude', 'rating']].fillna(0.0).values
    prices = df['price'].values
    nn = NearestNeighbors(n_neighbors=min(k+1, len(df)), algorithm='auto')
    nn.fit(features)
    dists, inds = nn.kneighbors(features)
    preds = []
    for i, neighbors in enumerate(inds):
        # remove self if present (distance zero)
        neigh = [n for n in neighbors if n != i]
        if len(neigh) == 0:
            preds.append(np.median(prices))
        else:
            preds.append(np.mean(prices[neigh]))
    return np.array(preds)


def make_map(df: pd.DataFrame, out_html: Path, title: str, center_lat: float, center_lon: float):
    fig = px.scatter_mapbox(
        df,
            # prepare an `address` string if missing
            addr_val = None
            if 'address' in row and row.get('address') is not None:
                addr_val = row.get('address')
            elif 'location' in row and row.get('location') is not None:
                loc = row.get('location')
                if isinstance(loc, dict):
                    lat = loc.get('latitude') or loc.get('lat') or loc.get('latitud')
                    lon = loc.get('longitude') or loc.get('lon') or loc.get('lng')
                    addr = loc.get('address') or loc.get('formatted') or ''
                    if lat is not None and lon is not None:
                        addr_val = str({'address': addr, 'latitude': lat, 'longitude': lon})
                    else:
                        addr_val = str(loc)
                else:
                    addr_val = str(loc)
            else:
                # try top-level lat/lon keys
                lat = row.get('latitude') or row.get('lat') or row.get('latitud')
                lon = row.get('longitude') or row.get('lon') or row.get('lng')
                if lat is not None and lon is not None:
                    addr_val = str({'address': row.get('address', ''), 'latitude': lat, 'longitude': lon})
                else:
                    addr_val = ''

            row['address'] = addr_val
            rows.append(row)

        df = pd.DataFrame(rows)

        # Ensure property_name column
        if 'property_name' not in df.columns:
            if 'name' in df.columns:
                df['property_name'] = df['name']
            elif 'title' in df.columns:
                df['property_name'] = df['title']
            else:
                df['property_name'] = df.index.map(lambda i: f"Property {i}")

        # Parse lat/lon from address string where possible
        lats = []
        lons = []
        for v in df['address'].fillna('').astype(str).values:
            lat, lon = parse_latlon(v)
            lats.append(lat)
            lons.append(lon)

        # if lat/lon columns already exist, prefer them when parse failed
        if 'latitude' in df.columns:
            existing_lat = pd.to_numeric(df['latitude'], errors='coerce')
            lats = [el if el is not None else (float(existing_lat.iloc[i]) if not np.isnan(existing_lat.iloc[i]) else None) for i, el in enumerate(lats)]
        if 'longitude' in df.columns:
            existing_lon = pd.to_numeric(df['longitude'], errors='coerce')
            lons = [el if el is not None else (float(existing_lon.iloc[i]) if not np.isnan(existing_lon.iloc[i]) else None) for i, el in enumerate(lons)]

        df['latitude'] = lats
        df['longitude'] = lons

        if 'price' in df.columns:
            df['price'] = pd.to_numeric(df['price'], errors='coerce')
        else:
            df['price'] = np.nan

        if 'rating' in df.columns:
            df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0.0)
        else:
            df['rating'] = 0.0

        # Drop rows without lat/lon or price
        df = df.dropna(subset=['latitude', 'longitude', 'price'])
        return df
if __name__ == '__main__':
    main()
