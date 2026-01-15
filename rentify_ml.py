"""
Quick start:
  python rentify_ml.py --uri "mongodb+srv://ajboncodin:0930839737@rentifydb.gaifxpk.mongodb.net/test?retryWrites=true&w=majority&appName=RentifyDB" --collection "properties" --out-dir "./ml-output"
"""



from typing import Tuple, List, Optional, Dict
import os
import sys
import math
import argparse
import json
from urllib.parse import urlparse

import numpy as np
import pandas as pd
from pymongo import MongoClient
from pymongo.errors import ConfigurationError

from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsRegressor, NearestNeighbors
from sklearn.cluster import KMeans
from sklearn.metrics import mean_squared_error, silhouette_score, davies_bouldin_score
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, RobustScaler
import matplotlib.pyplot as plt
import seaborn as sns

# ----------------- Defaults / Settings --------------------
RANDOM_STATE = 42
KMEANS_K = 3  # 3 for Low/Mid/High categories
KNN_NEIGHBORS = 5
TEST_SIZE = 0.2

# ------------------ Data loading ------------------------

def load_data(uri: str, db_name: str, collection_name: str, limit: Optional[int] = None) -> pd.DataFrame:
    """Connects to MongoDB and loads property documents into a pandas DataFrame."""
    try:
        client = MongoClient(uri)
        db = client[db_name]
    except ConfigurationError as ce:
        hint = (
            str(ce)
            + "\n\nHint: SRV connection strings (mongodb+srv://) require a valid cluster host name."
        )
        raise RuntimeError(hint) from ce
    except Exception as e:
        raise RuntimeError(f"Failed to connect to MongoDB: {e}") from e
    
    col = db[collection_name]
    cursor = col.find({})
    if limit and limit > 0:
        cursor = cursor.limit(limit)
    docs = list(cursor)

    if not docs:
        raise RuntimeError(f"No documents found in {db_name}.{collection_name}")

    df = pd.DataFrame(docs)

    # Ensure columns
    if 'property_name' not in df.columns:
        if 'name' in df.columns:
            df['property_name'] = df['name']
        else:
            df['property_name'] = df.get('title', pd.Series([f"Property {i+1}" for i in range(len(df))]))

    if 'address' not in df.columns:
        if 'location' in df.columns:
            df['address'] = df['location'].astype(str)
        else:
            df['address'] = pd.Series(["Unknown" for _ in range(len(df))])

    return df


# ------------------ Preprocessing -----------------------

def preprocess(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, List[str]]:
    """
    Enhanced preprocessing with better feature engineering and scaling
    """
    working = df.copy()

    # Normalize column names
    if 'beds' in working.columns and 'bedrooms' not in working.columns:
        working['bedrooms'] = working['beds']
    if 'baths' in working.columns and 'bathrooms' not in working.columns:
        working['bathrooms'] = working['baths']
    for size_col in ['size', 'area', 'sqft', 'square_feet']:
        if size_col in working.columns and 'size' not in working.columns:
            working['size'] = working[size_col]

    # Coerce price to numeric
    if 'price' in working.columns:
        working['price'] = pd.to_numeric(
            working['price'].astype(str).str.replace(r'[^\d.-]', '', regex=True), 
            errors='coerce'
        )

    if 'price' not in working.columns:
        raise RuntimeError("Missing required 'price' field in dataset.")

    # Remove properties with missing or zero price
    working = working[working['price'].notna() & (working['price'] > 0)].copy()
    
    if len(working) == 0:
        raise RuntimeError("No valid properties with price > 0")

    # Collect numeric columns
    numeric_cols = working.select_dtypes(include=[np.number]).columns.tolist()
    
    # Remove price from features (we'll use it as target/grouping variable)
    feature_cols = [c for c in numeric_cols if c != 'price']
    
    if len(feature_cols) == 0:
        raise RuntimeError("No numeric features found besides price")

    # Keep display columns
    display_cols = ['property_name', 'address', 'price']
    for c in display_cols:
        if c not in working.columns:
            working[c] = None
    display = working[display_cols].copy()
    display['original_index'] = working.index

    X_features = working[feature_cols].copy()

    # Impute missing values with median
    imputer = SimpleImputer(strategy='median')
    X_imputed = pd.DataFrame(
        imputer.fit_transform(X_features), 
        columns=feature_cols, 
        index=X_features.index
    )

    # Use RobustScaler for better handling of outliers
    scaler = RobustScaler()
    X_scaled = pd.DataFrame(
        scaler.fit_transform(X_imputed), 
        columns=feature_cols, 
        index=X_imputed.index
    )

    return display, X_scaled, X_imputed, feature_cols


# ------------------ Improved KNN for Recommendations -------------------

def get_knn_recommendations(
    display: pd.DataFrame,
    X_scaled: pd.DataFrame,
    X_unscaled: pd.DataFrame,
    target_price_range: Tuple[float, float] = None,
    target_features: Dict[str, float] = None,
    n_recommendations: int = 5,
    n_neighbors: int = 10
) -> pd.DataFrame:
    """
    Get property recommendations using KNN based on price range and/or feature similarity
    
    Args:
        target_price_range: (min_price, max_price) tuple
        target_features: Dict of feature values to match (e.g., {'bedrooms': 2, 'bathrooms': 1})
        n_recommendations: Number of recommendations to return
    """
    results = []
    
    # Filter by price range if specified
    if target_price_range:
        min_price, max_price = target_price_range
        price_mask = (display['price'] >= min_price) & (display['price'] <= max_price)
        candidate_indices = display[price_mask].index
    else:
        candidate_indices = display.index

    if len(candidate_indices) == 0:
        return pd.DataFrame()

    # Helper to take lowest-priced candidates (excluding any already chosen)
    def _take_lowest(available_idx, needed, exclude_idx=None):
        avail = display.loc[available_idx].copy()
        if exclude_idx is not None and len(exclude_idx) > 0:
            avail = avail.drop(index=list(exclude_idx), errors='ignore')
        avail = avail.sort_values('price')
        return avail.head(needed).index.tolist()

    recommended_idx_list = []

    # If target features specified, find similar properties first
    if target_features:
        # Build a target vector from provided features (use mean for unknown features)
        try:
            target_vector = X_scaled.loc[candidate_indices].mean().values.reshape(1, -1)
        except Exception:
            target_vector = np.zeros((1, X_scaled.shape[1]))

        # Update with specified features normalized using unscaled stats
        for feat, val in (target_features or {}).items():
            if feat in X_unscaled.columns:
                feat_idx = list(X_unscaled.columns).index(feat)
                feat_mean = X_unscaled.loc[candidate_indices, feat].mean()
                feat_std = X_unscaled.loc[candidate_indices, feat].std()
                if pd.notna(feat_std) and feat_std > 0:
                    target_vector[0, feat_idx] = (val - feat_mean) / feat_std

        # Find nearest neighbors among candidates
        nn = NearestNeighbors(n_neighbors=min(n_neighbors, max(1, len(candidate_indices))))
        nn.fit(X_scaled.loc[candidate_indices])
        distances, indices = nn.kneighbors(target_vector)
        # Map neighbor positions back to original indices
        neighbor_positions = indices[0]
        candidate_list = list(candidate_indices)
        for pos in neighbor_positions:
            recommended_idx_list.append(candidate_list[pos])

        # Ensure recommendations are ordered by price ascending (lower price preferred)
        recommended_idx_list = sorted(set(recommended_idx_list), key=lambda i: display.loc[i, 'price'])

    # Fill remaining recommendations with lowest-priced candidates
    if len(recommended_idx_list) < n_recommendations:
        needed = n_recommendations - len(recommended_idx_list)
        filler = _take_lowest(candidate_indices, needed, exclude_idx=set(recommended_idx_list))
        recommended_idx_list.extend(filler)

    # If still fewer than requested (dataset smaller), return whatever we have
    final_indices = recommended_idx_list[:n_recommendations]

    # Build results dataframe
    if len(final_indices) == 0:
        return pd.DataFrame()

    result_df = display.loc[final_indices].copy()

    # Add feature columns from unscaled features
    for col in X_unscaled.columns:
        if col not in result_df.columns:
            result_df[col] = X_unscaled.loc[final_indices, col]

    # If we have similarity distances, add a normalized similarity score (higher is better)
    if target_features and 'distances' in locals():
        # distances shape (1, n_neighbors) — map to final_indices where possible
        sim_map = {}
        try:
            for d, pos in zip(distances[0], neighbor_positions):
                idx = list(candidate_indices)[pos]
                sim_map[idx] = 1 / (1 + float(d))
        except Exception:
            pass
        if sim_map:
            result_df['similarity_score'] = result_df.index.map(lambda i: sim_map.get(i, 0.0))
            result_df = result_df.sort_values(['similarity_score', 'price'], ascending=[False, True])
    else:
        # Sort by price ascending (lower price first)
        result_df = result_df.sort_values('price', ascending=True)

    return result_df.reset_index(drop=True)


def evaluate_knn_regression(
    display: pd.DataFrame, 
    X_scaled: pd.DataFrame, 
    X_unscaled: pd.DataFrame,
    feature_cols: List[str],
    n_neighbors: int = KNN_NEIGHBORS
) -> Tuple[float, pd.DataFrame]:
    """
    Evaluate KNN for price prediction (to show model quality)
    """
    y = display['price'].values
    
    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X_scaled, y, X_scaled.index, 
        test_size=TEST_SIZE, 
        random_state=RANDOM_STATE
    )
    
    # Use regression instead of classification
    regressor = KNeighborsRegressor(n_neighbors=n_neighbors)
    regressor.fit(X_train, y_train)
    
    y_pred = regressor.predict(X_test)
    
    # Calculate RMSE and R²
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    # Calculate MAPE (Mean Absolute Percentage Error)
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    
    # Build results
    results = display.loc[idx_test].copy()
    for col in feature_cols:
        if col in X_unscaled.columns:
            results[col] = X_unscaled.loc[idx_test, col]
    
    results['actual_price'] = y_test
    results['predicted_price'] = y_pred
    results['error_percent'] = np.abs((y_test - y_pred) / y_test) * 100
    
    results = results.sort_values('error_percent')
    
    return mape, results


# ------------------ Improved KMeans clustering --------------------

def run_improved_kmeans(
    display: pd.DataFrame, 
    X_scaled: pd.DataFrame, 
    X_unscaled: pd.DataFrame,
    feature_cols: List[str],
    k: int = KMEANS_K,
    use_price_aware_init: bool = True
) -> Tuple[pd.DataFrame, float, float, float, Dict[int, str], bool]:
    """
    Improved KMeans with price-aware initialization for better balance
    """
    n_samples = X_scaled.shape[0]
    if n_samples < 2:
        raise RuntimeError("Not enough samples to run KMeans.")

    k = min(k, n_samples)
    if k <= 1:
        raise RuntimeError("K must be at least 2 for clustering.")

    # Price-aware initialization
    if use_price_aware_init:
        # Create price quantiles as initial cluster centers
        price_quantiles = np.linspace(0, 1, k + 1)[1:-1]
        price_thresholds = display['price'].quantile(price_quantiles).values
        
        # Initialize cluster centers based on price ranges
        init_centers = []
        for i in range(k):
            if i == 0:
                mask = display['price'] <= price_thresholds[0]
            elif i == k - 1:
                mask = display['price'] > price_thresholds[-1]
            else:
                mask = (display['price'] > price_thresholds[i-1]) & \
                       (display['price'] <= price_thresholds[i])
            
            if mask.sum() > 0:
                center = X_scaled[mask].mean().values
                init_centers.append(center)
        
        if len(init_centers) == k:
            init_centers = np.array(init_centers)
            kmeans = KMeans(
                n_clusters=k, 
                init=init_centers,
                n_init=1,
                random_state=RANDOM_STATE
            )
        else:
            kmeans = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
    else:
        kmeans = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
    
    labels = kmeans.fit_predict(X_scaled)
    inertia = float(kmeans.inertia_)

    # Calculate multiple quality metrics
    sil_score = np.nan
    db_score = np.nan
    
    try:
        if 1 < k < n_samples:
            sil_score = float(silhouette_score(X_scaled, labels))
            db_score = float(davies_bouldin_score(X_scaled, labels))
    except Exception as e:
        print(f"Warning: Could not compute clustering metrics: {e}")

    # Build results
    results = display.copy()
    
    for col in feature_cols:
        if col in X_unscaled.columns:
            results[col] = X_unscaled[col]

    results['cluster_label'] = labels
    
    # Assign budget categories based on average price per cluster
    cluster_avg_prices = results.groupby('cluster_label')['price'].mean().sort_values()

    budget_labels = ["Low Budget", "Mid-Range", "High-End", "Premium", "Luxury"]

    cluster_name_map = {}

    # If clustering produced fewer than 3 distinct clusters or one cluster dominates,
    # fallback to price tertiles (qcut) to guarantee Low/Mid/High buckets.
    n_clusters_found = len(cluster_avg_prices)
    cluster_sizes = results['cluster_label'].value_counts()
    dominant_ratio = cluster_sizes.max() / float(n_samples) if n_samples > 0 else 1.0

    tertile_used = False
    if n_clusters_found < 3 or dominant_ratio > 0.85:
        # Fallback: split by price tertiles to ensure three buckets exist
        try:
            tertile_labels = pd.qcut(results['price'], q=3, labels=[0, 1, 2], duplicates='drop')
        except Exception:
            tertile_labels = pd.cut(results['price'], bins=3, labels=[0, 1, 2])

        # Ensure tertile_labels are integer-like
        tertile_labels = tertile_labels.astype(int)

        # Map tertile labels to budget labels
        tertile_map = {0: 'Low Budget', 1: 'Mid-Range', 2: 'High-End'}
        results['budget_category'] = tertile_labels.map(tertile_map)

        # Set cluster_name_map to reflect tertile mapping (keys are synthetic cluster ids 0..2)
        cluster_name_map = {i: tertile_map.get(i, f'Tier {i+1}') for i in range(3)}

        # Replace cluster_label to reflect tertile buckets (for downstream grouping)
        results['cluster_label'] = tertile_labels

        # We can't reliably compute silhouette/davies scores on tertile labels here; set to NaN
        sil_score = float('nan')
        db_score = float('nan')
        tertile_used = True
    else:
        # Normal mapping: map sorted cluster ids to budget labels in order
        for idx, (cluster_num, avg_price) in enumerate(cluster_avg_prices.items()):
            if idx < len(budget_labels):
                cluster_name_map[cluster_num] = budget_labels[idx]
            else:
                cluster_name_map[cluster_num] = f"Tier {idx+1}"

        results['budget_category'] = results['cluster_label'].map(cluster_name_map)

    # Add price percentile within cluster
    results['price_percentile_in_cluster'] = results.groupby('cluster_label')['price'].rank(pct=True)

    return results, sil_score, db_score, inertia, cluster_name_map, tertile_used


# ------------------ Enhanced Plotting --------------------

def plot_improved_results(
    knn_mape: float,
    knn_results: pd.DataFrame,
    kmeans_results: pd.DataFrame,
    kmeans_sil: float,
    kmeans_db: float,
    X_unscaled: pd.DataFrame,
    cluster_name_map: Dict[int, str],
    sample_recommendations: pd.DataFrame,
    out_dir: Optional[str] = None
):
    """Enhanced plotting with recommendations and balanced clusters"""
    sns.set_style("whitegrid")
    fig = plt.figure(figsize=(20, 14))
    
    cluster_colors = ['#3498db', '#e67e22', '#e74c3c', '#9b59b6', '#1abc9c']
    
    # ========== 1. Model Performance Metrics ==========
    ax1 = plt.subplot(3, 3, 1)
    
    metrics = ['KNN MAPE\n(lower=better)', 'KMeans\nSilhouette', 'KMeans\nDavies-Bouldin\n(lower=better)']
    sil_plot = 0.0 if np.isnan(kmeans_sil) else kmeans_sil
    db_plot = 0.0 if np.isnan(kmeans_db) else kmeans_db
    
    # Normalize MAPE to 0-1 scale (inverse, since lower is better)
    mape_normalized = max(0, 1 - (knn_mape / 100))
    db_normalized = max(0, 1 - (db_plot / 10))  # Rough normalization
    
    values = [mape_normalized, sil_plot, db_normalized]
    colors_list = ['#2ecc71', '#3498db', '#f39c12']
    
    bars = ax1.bar(metrics, values, color=colors_list, alpha=0.7, edgecolor='black', linewidth=2)
    ax1.set_ylim(0, 1.1)
    ax1.set_ylabel('Score', fontsize=11, fontweight='bold')
    ax1.set_title('Model Performance Metrics', fontsize=13, fontweight='bold', pad=15)
    ax1.grid(axis='y', alpha=0.3)
    
    # Add actual value labels
    ax1.text(bars[0].get_x() + bars[0].get_width()/2., bars[0].get_height() + 0.02,
            f'{knn_mape:.1f}%', ha='center', va='bottom', fontsize=10, fontweight='bold')
    ax1.text(bars[1].get_x() + bars[1].get_width()/2., bars[1].get_height() + 0.02,
            f'{sil_plot:.3f}', ha='center', va='bottom', fontsize=10, fontweight='bold')
    ax1.text(bars[2].get_x() + bars[2].get_width()/2., bars[2].get_height() + 0.02,
            f'{db_plot:.3f}', ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    # ========== 2. Cluster Distribution ==========
    ax2 = plt.subplot(3, 3, 2)
    
    if not kmeans_results.empty and 'budget_category' in kmeans_results.columns:
        # Desired ordering for readability — ensure High-End is shown in summaries
        desired_order = ["Low Budget", "Mid-Range", "High-End", "Premium", "Luxury"]

        present_cats = list(kmeans_results['budget_category'].unique())
        # Order present categories by their mean price, but keep desired ordering for missing ones
        present_ordered = sorted(present_cats, key=lambda x: kmeans_results[kmeans_results['budget_category']==x]['price'].mean())

        # Use intersection but ensure High-End appears in the table (may be zero)
        categories = [c for c in desired_order if c in present_ordered] + [c for c in present_ordered if c not in desired_order]

        counts = [int(kmeans_results[kmeans_results['budget_category']==cat].shape[0]) for cat in categories]

        colors_list = [cluster_colors[i % len(cluster_colors)] for i in range(len(categories))]

        # If all counts are zero (unlikely), skip pie
        if sum(counts) > 0:
            wedges, texts, autotexts = ax2.pie(
                counts, 
                labels=categories,
                autopct='%1.1f%%',
                colors=colors_list,
                startangle=90,
                wedgeprops={'edgecolor': 'black', 'linewidth': 2}
            )
        
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
            autotext.set_fontsize(10)
        
        ax2.set_title('Cluster Distribution', fontsize=13, fontweight='bold', pad=15)
    
    # ========== 3. Cluster Summary Table ==========
    ax3 = plt.subplot(3, 3, 3)
    ax3.axis('off')
    
    if not kmeans_results.empty and 'budget_category' in kmeans_results.columns:
        # Build summary for a canonical set of categories so High-End always appears
        desired_order = ["Low Budget", "Mid-Range", "High-End", "Premium", "Luxury"]
        present_categories = list(kmeans_results['budget_category'].unique())
        # Keep desired_order but only include those present OR explicitly include High-End
        categories = [c for c in desired_order if (c in present_categories) or c == 'High-End']
        # Also append any unexpected categories at the end
        categories += [c for c in present_categories if c not in categories]

        summary_data = []
        for category in categories:
            cluster_data = kmeans_results[kmeans_results['budget_category'] == category]
            if cluster_data.empty:
                summary_data.append([
                    category,
                    0,
                    'N/A',
                    'N/A'
                ])
            else:
                count = len(cluster_data)
                avg_price = cluster_data['price'].mean()
                min_price = cluster_data['price'].min()
                max_price = cluster_data['price'].max()
                summary_data.append([
                    category,
                    int(count),
                    f"₱{avg_price:,.0f}",
                    f"₱{min_price:,.0f} - ₱{max_price:,.0f}"
                ])

        table = ax3.table(
            cellText=summary_data,
            colLabels=['Category', 'Count', 'Avg Price', 'Price Range'],
            cellLoc='center',
            loc='center',
            colWidths=[0.25, 0.15, 0.25, 0.35]
        )
        table.auto_set_font_size(False)
        table.set_fontsize(9)
        table.scale(1, 2.5)

        # Style header
        for i in range(4):
            table[(0, i)].set_facecolor('#34495e')
            table[(0, i)].set_text_props(weight='bold', color='white')

        # Color rows
        for i, row in enumerate(summary_data, 1):
            color_idx = i-1 if i-1 < len(cluster_colors) else 0
            color = cluster_colors[color_idx]
            for j in range(4):
                table[(i, j)].set_facecolor(color)
                table[(i, j)].set_alpha(0.3)

        ax3.set_title('Cluster Statistics', fontsize=13, fontweight='bold', pad=15)
        # improve readability by bolding header row
        for (r, c), cell in table.get_celld().items():
            if r == 0:
                cell.set_facecolor('#2c3e50')
                cell.set_text_props(weight='bold', color='white')
    
    # ========== 4. Price Distribution by Cluster ==========
    ax4 = plt.subplot(3, 3, 4)
    
    if not kmeans_results.empty and 'budget_category' in kmeans_results.columns:
        categories = sorted(
            kmeans_results['budget_category'].unique(),
            key=lambda x: kmeans_results[kmeans_results['budget_category']==x]['price'].mean()
        )
        
        data_to_plot = [
            kmeans_results[kmeans_results['budget_category']==cat]['price'].values 
            for cat in categories
        ]
        
        bp = ax4.boxplot(
            data_to_plot,
            labels=categories,
            patch_artist=True,
            widths=0.6
        )
        
        for patch, color_idx in zip(bp['boxes'], range(len(categories))):
            color = cluster_colors[color_idx % len(cluster_colors)]
            patch.set_facecolor(color)
            patch.set_alpha(0.7)
        
        ax4.set_ylabel('Price (₱)', fontsize=11, fontweight='bold')
        ax4.set_title('Price Distribution by Cluster', fontsize=13, fontweight='bold', pad=15)
        ax4.grid(axis='y', alpha=0.3)
        ax4.ticklabel_format(style='plain', axis='y')
        ax4.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'₱{x:,.0f}'))
        plt.setp(ax4.xaxis.get_majorticklabels(), rotation=45, ha='right')
    
    # ========== 5. Cluster Scatter Plot ==========
    ax5 = plt.subplot(3, 3, 5)
    
    if not kmeans_results.empty and 'budget_category' in kmeans_results.columns:
        feature_cols = [c for c in X_unscaled.columns if c != 'price']
        y_feature = feature_cols[0] if feature_cols else 'price'
        
        categories = sorted(
            kmeans_results['budget_category'].unique(),
            key=lambda x: kmeans_results[kmeans_results['budget_category']==x]['price'].mean()
        )
        
        for idx, category in enumerate(categories):
            cluster_data = kmeans_results[kmeans_results['budget_category'] == category]
            color = cluster_colors[idx % len(cluster_colors)]
            ax5.scatter(
                cluster_data['price'],
                cluster_data[y_feature] if y_feature in cluster_data else cluster_data['price'],
                label=f'{category} (n={len(cluster_data)})',
                color=color,
                s=100,
                alpha=0.6,
                edgecolors='black',
                linewidth=1.5
            )
        
        ax5.set_xlabel('Price (₱)', fontsize=11, fontweight='bold')
        ax5.set_ylabel(f'{y_feature.title()}', fontsize=11, fontweight='bold')
        ax5.set_title('Property Clusters', fontsize=13, fontweight='bold', pad=15)
        ax5.legend(loc='best', fontsize=9, framealpha=0.9)
        ax5.grid(True, alpha=0.3)
        ax5.ticklabel_format(style='plain', axis='x')
        ax5.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'₱{x:,.0f}'))
    
    # ========== 6. KNN Prediction Accuracy ==========
    ax6 = plt.subplot(3, 3, 6)
    
    if not knn_results.empty:
        # prefer low error then lower actual price for display
        top_10 = knn_results.sort_values(['error_percent', 'actual_price'], ascending=[True, True]).head(10)
        
        y_pos = np.arange(len(top_10))
        
        bars = ax6.barh(
            y_pos,
            top_10['error_percent'],
            color='#3498db',
            alpha=0.7,
            edgecolor='black',
            linewidth=1.5
        )
        
        labels = [f"{row['property_name'][:20]}\n(₱{row['actual_price']:,.0f})" 
                 for _, row in top_10.iterrows()]
        
        ax6.set_yticks(y_pos)
        ax6.set_yticklabels(labels, fontsize=8)
        ax6.set_xlabel('Prediction Error (%)', fontsize=11, fontweight='bold')
        ax6.set_title('Top 10 Most Accurate KNN Predictions', fontsize=13, fontweight='bold', pad=15)
        ax6.grid(axis='x', alpha=0.3)
        
        for bar, error in zip(bars, top_10['error_percent']):
            width = bar.get_width()
            ax6.text(width, bar.get_y() + bar.get_height()/2,
                    f' {error:.1f}%', ha='left', va='center', fontsize=8, fontweight='bold')
    
    # ========== 7-9. Sample Recommendations ==========
    if not sample_recommendations.empty:
        for idx, (price_range, sample_df) in enumerate(sample_recommendations.groupby('price_range')):
            ax = plt.subplot(3, 3, 7 + idx)
            
            top_5 = sample_df.head(5)
            y_pos = np.arange(len(top_5))
            
            bars = ax.barh(
                y_pos,
                top_5['price'],
                color='#2ecc71',
                alpha=0.7,
                edgecolor='black',
                linewidth=1.5
            )
            
            labels = []
            for _, row in top_5.iterrows():
                name = str(row['property_name'])[:25]
                features = []
                if 'bedrooms' in row and pd.notna(row['bedrooms']):
                    features.append(f"{int(row['bedrooms'])}BR")
                if 'bathrooms' in row and pd.notna(row['bathrooms']):
                    features.append(f"{int(row['bathrooms'])}BA")
                feature_str = " | ".join(features) if features else ""
                labels.append(f"{name}\n{feature_str}")
            
            ax.set_yticks(y_pos)
            ax.set_yticklabels(labels, fontsize=8)
            ax.set_xlabel('Price (₱)', fontsize=10, fontweight='bold')
            ax.set_title(f'Recommendations: {price_range}', fontsize=12, fontweight='bold', pad=10)
            ax.grid(axis='x', alpha=0.3)
            ax.ticklabel_format(style='plain', axis='x')
            ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'₱{x:,.0f}'))
            
            for bar, price in zip(bars, top_5['price']):
                width = bar.get_width()
                ax.text(width, bar.get_y() + bar.get_height()/2,
                       f' ₱{price:,.0f}', ha='left', va='center', fontsize=8, fontweight='bold')
    
    plt.tight_layout(pad=3.0)
    
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, 'rentify_ml_improved_plots.png')
        plt.savefig(out_path, dpi=200, bbox_inches='tight')
        print(f"\n✓ Saved plots to {out_path}")
    
    plt.show()


# ------------------ Main -------------------------------

def main(argv=None):
    parser = argparse.ArgumentParser(description='Improved Rentify ML Analysis')
    parser.add_argument('--uri', type=str, default=os.getenv('MONGODB_URI'), help='MongoDB URI')
    parser.add_argument('--db', type=str, default=os.getenv('MONGODB_DB', 'rentify_db'), help='MongoDB DB name')
    parser.add_argument('--collection', type=str, default=os.getenv('MONGODB_COLLECTION', 'properties'), 
                       help='MongoDB collection name')
    parser.add_argument('--limit', type=int, default=0, help='Limit documents (0 = all)')
    parser.add_argument('--kmeans-k', type=int, default=KMEANS_K, help='K for KMeans (default=3)')
    parser.add_argument('--knn-k', type=int, default=KNN_NEIGHBORS, help='k (neighbors) for KNN')
    parser.add_argument('--out-dir', type=str, default=None, help='Directory to save outputs')

    args = parser.parse_args(argv)

    # Config file support
    config_path = os.path.join(os.getcwd(), 'rentify_ml_config.json')
    config = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception:
            pass

    uri = args.uri or config.get('uri')
    if not uri:
        print("ERROR: MongoDB URI required via --uri, MONGODB_URI env var, or config.")
        sys.exit(2)

    limit = args.limit if args.limit > 0 else None

    # Parse DB from URI if not supplied
    if (not args.db or args.db == 'rentify_db') and uri:
        try:
            p = urlparse(uri)
            path_db = p.path.lstrip('/') if p.path else ''
            if path_db:
                args.db = path_db.split('?')[0]
        except Exception:
            pass

    print("\n" + "="*70)
    print("  RENTIFY ML - Improved Analysis")
    print("  KNN: Recommendations | KMeans: Balanced Clustering")
    print("="*70)
    
    print("\n📊 Loading data from MongoDB...")
    df = load_data(uri, args.db, args.collection, limit=limit)
    print(f"✓ Loaded {len(df)} properties")

    print("\n🔧 Preprocessing data...")
    display, X_scaled, X_unscaled, feature_cols = preprocess(df)
    print(f"✓ Using {len(feature_cols)} features: {', '.join(feature_cols)}")
    print(f"✓ Valid properties: {len(display)}")

    # ========== KNN Evaluation ==========
    print("\n🤖 Evaluating KNN for price prediction...")
    try:
        knn_mape, knn_results = evaluate_knn_regression(
            display, X_scaled, X_unscaled, feature_cols, n_neighbors=args.knn_k
        )
        print(f"✓ KNN MAPE (Mean Absolute Percentage Error): {knn_mape:.2f}%")
        
        if not knn_results.empty:
            print(f"\n📋 Top 5 most accurate predictions (lowest error, then cheapest):")
            # Prefer low error, then lower actual price
            top_5 = knn_results.sort_values(['error_percent', 'actual_price'], ascending=[True, True])
            top_5 = top_5[['property_name', 'actual_price', 'predicted_price', 'error_percent']].head(5)
            for idx, row in top_5.iterrows():
                print(f"  • {row['property_name'][:40]}")
                print(f"    Actual: ₱{row['actual_price']:,.0f} | Predicted: ₱{row['predicted_price']:,.0f} | Error: {row['error_percent']:.1f}%")
    except Exception as e:
        print(f"✗ KNN evaluation failed: {str(e)}")
        knn_mape = 0.0
        knn_results = pd.DataFrame()

    # ========== KMeans Clustering ==========
    print(f"\n🎯 Running improved KMeans clustering (K={args.kmeans_k})...")
    try:
        kmeans_results, sil_score, db_score, inertia, cluster_name_map, tertile_used = run_improved_kmeans(
            display, X_scaled, X_unscaled, feature_cols, k=args.kmeans_k
        )
        
        print(f"✓ KMeans Inertia: {inertia:.2f}")
        if not math.isnan(sil_score):
            print(f"✓ Silhouette Score: {sil_score:.4f} (higher is better)")
        if not math.isnan(db_score):
            print(f"✓ Davies-Bouldin Score: {db_score:.4f} (lower is better)")
        
        print("\n📊 Cluster distribution:")
        cluster_counts = kmeans_results['budget_category'].value_counts()
        for category in sorted(cluster_counts.index,
                              key=lambda x: kmeans_results[kmeans_results['budget_category']==x]['price'].mean()):
            count = cluster_counts[category]
            pct = (count / len(kmeans_results)) * 100
            avg_price = kmeans_results[kmeans_results['budget_category']==category]['price'].mean()
            min_price = kmeans_results[kmeans_results['budget_category']==category]['price'].min()
            max_price = kmeans_results[kmeans_results['budget_category']==category]['price'].max()
            print(f"  {category}: {count} properties ({pct:.1f}%)")
            print(f"    Price range: ₱{min_price:,.0f} - ₱{max_price:,.0f} (avg: ₱{avg_price:,.0f})")

        # Diagnostic: number of clusters found, sizes, avg prices, tertile fallback
        n_clusters_found = len(kmeans_results['cluster_label'].unique()) if 'cluster_label' in kmeans_results.columns else 0
        print(f"\nDiagnostics: clusters found = {n_clusters_found}")
        cluster_summary = kmeans_results.groupby('cluster_label')['price'].agg(['count', 'mean']).sort_index()
        for cid, row in cluster_summary.iterrows():
            print(f"  Cluster {int(cid)}: count={int(row['count'])}, avg_price=₱{row['mean']:,.0f}")
        print(f"Tertile fallback used: {bool(tertile_used)}")
    except Exception as e:
        print(f"✗ KMeans clustering failed: {str(e)}")
        kmeans_results = pd.DataFrame()
        sil_score = float('nan')
        db_score = float('nan')
        cluster_name_map = {}

    # ========== Generate Recommendations ==========
    print("\n🎁 Generating property recommendations...")
    
    # Define price ranges based on data
    if not display.empty:
        price_min = display['price'].min()
        price_max = display['price'].max()
        price_range_size = (price_max - price_min) / 3
        
        price_ranges = {
            'Budget Friendly': (price_min, price_min + price_range_size),
            'Mid-Range': (price_min + price_range_size, price_min + 2*price_range_size),
            'Premium': (price_min + 2*price_range_size, price_max)
        }
        
        all_recommendations = []
        
        for range_name, (min_p, max_p) in price_ranges.items():
            try:
                recs = get_knn_recommendations(
                    display, X_scaled, X_unscaled,
                    target_price_range=(min_p, max_p),
                    n_recommendations=5,
                    n_neighbors=args.knn_k
                )
                if not recs.empty:
                    recs['price_range'] = range_name
                    all_recommendations.append(recs)
                    print(f"✓ {range_name}: Found {len(recs)} recommendations (₱{min_p:,.0f} - ₱{max_p:,.0f})")
            except Exception as e:
                print(f"✗ Failed to generate {range_name} recommendations: {e}")
        
        if all_recommendations:
            sample_recommendations = pd.concat(all_recommendations, ignore_index=True)
        else:
            sample_recommendations = pd.DataFrame()
    else:
        sample_recommendations = pd.DataFrame()

    # ========== Save Results ==========
    if args.out_dir:
        os.makedirs(args.out_dir, exist_ok=True)
        
        # Save KNN results
        if not knn_results.empty:
            knn_csv = os.path.join(args.out_dir, 'knn_evaluation.csv')
            knn_results.to_csv(knn_csv, index=False)
            print(f"\n✓ Saved KNN evaluation to {knn_csv}")
        
        # Save KMeans results
        if not kmeans_results.empty:
            kmeans_csv = os.path.join(args.out_dir, 'kmeans_clusters.csv')
            kmeans_results.to_csv(kmeans_csv, index=False)
            print(f"✓ Saved KMeans clusters to {kmeans_csv}")
        
        # Save recommendations
        if not sample_recommendations.empty:
            rec_csv = os.path.join(args.out_dir, 'property_recommendations.csv')
            sample_recommendations.to_csv(rec_csv, index=False)
            print(f"✓ Saved recommendations to {rec_csv}")
        
        # Save summary
        try:
            summary = {
                'knn_mape': float(knn_mape) if 'knn_mape' in locals() else None,
                'kmeans_inertia': float(inertia) if 'inertia' in locals() else None,
                'kmeans_silhouette': float(sil_score) if 'sil_score' in locals() else None,
                'kmeans_davies_bouldin': float(db_score) if 'db_score' in locals() else None,
                'num_properties': int(len(display)),
                'num_features': len(feature_cols),
                'cluster_distribution': {}
            }
            
            if not kmeans_results.empty:
                for category in kmeans_results['budget_category'].unique():
                    count = len(kmeans_results[kmeans_results['budget_category']==category])
                    summary['cluster_distribution'][category] = int(count)
            
            summary_path = os.path.join(args.out_dir, 'analysis_summary.json')
            with open(summary_path, 'w', encoding='utf-8') as sf:
                json.dump(summary, sf, indent=2)
            print(f"✓ Saved analysis summary to {summary_path}")
        except Exception as e:
            print(f"Warning: Could not save summary: {e}")

    # ========== Plot Results ==========
    print("\n📈 Generating visualizations...")
    try:
        plot_improved_results(
            knn_mape if 'knn_mape' in locals() else 0.0,
            knn_results if 'knn_results' in locals() else pd.DataFrame(),
            kmeans_results if 'kmeans_results' in locals() else pd.DataFrame(),
            sil_score if 'sil_score' in locals() else float('nan'),
            db_score if 'db_score' in locals() else float('nan'),
            X_unscaled if 'X_unscaled' in locals() else pd.DataFrame(),
            cluster_name_map if 'cluster_name_map' in locals() else {},
            sample_recommendations if 'sample_recommendations' in locals() else pd.DataFrame(),
            out_dir=args.out_dir
        )
    except Exception as e:
        print(f"Warning: Plotting failed: {e}")
    
    print("\n" + "="*70)
    print("  Analysis Complete!")
    print("="*70)


if __name__ == '__main__':
    main()