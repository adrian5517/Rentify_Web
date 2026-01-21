import pandas as pd
import numpy as np
import folium
from math import radians, cos, sin, asin, sqrt
from pathlib import Path

# ===============================
# LOAD DATA
# ===============================
BASE = Path(__file__).parent
df = pd.read_csv(BASE / "property_recommendations.csv")

# ======================================================
# REMOVE this block if you already have real lat/lon
# ======================================================
np.random.seed(42)
df["latitude"] = 13.62 + np.random.normal(0, 0.01, len(df))
df["longitude"] = 123.19 + np.random.normal(0, 0.01, len(df))

# ===============================
# CENTER POINT
# ===============================
NCF_LAT = 13.6219
NCF_LON = 123.1948

# ===============================
# HAVERSINE DISTANCE (km)
# ===============================
def haversine(lat1, lon1, lat2, lon2):
    # convert degrees to radians (preserve correct variable order)
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return 6371 * c

df["distance_km"] = df.apply(
    lambda x: haversine(NCF_LAT, NCF_LON, x["latitude"], x["longitude"]),
    axis=1
)

# ===============================
# USER SETTINGS
# ===============================
USER_BUDGET = 3000

# Weighting
W_PRICE = 0.4
W_DISTANCE = 0.4
W_RATING = 0.2

# ===============================
# NORMALIZATION
# ===============================
df["price_norm"] = df["price"] / df["price"].max()
df["distance_norm"] = df["distance_km"] / df["distance_km"].max()

if df["rating"].max() > 0:
    df["rating_norm"] = 1 - (df["rating"] / df["rating"].max())
else:
    df["rating_norm"] = 1

# ===============================
# WEIGHTED DEAL SCORE
# LOWER = BETTER
# ===============================
df["deal_score"] = (
    W_PRICE * df["price_norm"] +
    W_DISTANCE * df["distance_norm"] +
    W_RATING * df["rating_norm"]
)

# ===============================
# FINAL RECOMMENDATION
# ===============================
recommended = (
    df[df["price"] <= USER_BUDGET]
    .sort_values("deal_score")
    .head(5)
)

# ===============================
# LEAFLET / FOLIUM MAP
# ===============================
m = folium.Map(location=[NCF_LAT, NCF_LON], zoom_start=15)

# Center marker
folium.Marker(
    [NCF_LAT, NCF_LON],
    popup="Naga College Foundation",
    icon=folium.Icon(icon="graduation-cap", prefix="fa")
).add_to(m)

# All properties
for _, row in df.iterrows():
    folium.CircleMarker(
        location=[row["latitude"], row["longitude"]],
        radius=5,
        color="blue",
        fill=True,
        fill_opacity=0.5,
        popup=f"""
        <b>{row['property_name']}</b><br>
        Price: ₱{row['price']}<br>
        Distance: {row['distance_km']:.2f} km
        """
    ).add_to(m)

# Recommended properties
for _, row in recommended.iterrows():
    folium.Marker(
        location=[row["latitude"], row["longitude"]],
        popup=f"""
        <b>{row['property_name']}</b><br>
        Price: ₱{row['price']}<br>
        Distance: {row['distance_km']:.2f} km<br>
        Deal Score: {row['deal_score']:.3f}
        """,
        icon=folium.Icon(color="green", icon="home")
    ).add_to(m)

map_file = "ncf_rental_recommendation_map.html"
m.save(map_file)

print(f"Map saved successfully as: {map_file}")

# ===============================
# DISPLAY FINAL RESULTS (TABLE)
# ===============================
print("\nTOP RECOMMENDED PROPERTIES (Budget + Distance + Rating):\n")

result_table = recommended[
    ["property_name", "price", "distance_km", "deal_score"]
].copy()

result_table["distance_km"] = result_table["distance_km"].round(2)
result_table["deal_score"] = result_table["deal_score"].round(3)

print(result_table.to_string(index=False))
