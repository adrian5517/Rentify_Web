#!/usr/bin/env python3
from pathlib import Path
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import argparse


def main(output_dir=None):
    repo_root = Path(__file__).resolve().parent.parent
    data_path = repo_root / "ml-output" / "kmeans_clusters.csv"
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")

    df = pd.read_csv(data_path)
    df['price'] = pd.to_numeric(df['price'], errors='coerce')

    # Ensure we have a budget_category column; fall back to mapping from cluster_label if needed
    if 'budget_category' not in df.columns or df['budget_category'].isnull().all():
        mapping = {0: 'Low Budget', 1: 'Mid-Range', 2: 'High-End'}
        if 'cluster_label' in df.columns:
            df['budget_category'] = df['cluster_label'].map(mapping)
        else:
            df['budget_category'] = 'Unknown'

    order = ['Low Budget', 'Mid-Range', 'High-End']

    out_dir = repo_root / "ml-output"
    if output_dir:
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

    # Bar chart: counts per budget category
    counts = df['budget_category'].value_counts().reindex(order).fillna(0)
    plt.figure(figsize=(6, 4))
    sns.barplot(x=counts.index, y=counts.values, palette='pastel')
    plt.ylabel('Count')
    plt.xlabel('Budget Category')
    plt.title('Properties by Budget Category (kmeans)')
    plt.tight_layout()
    counts_path = out_dir / 'kmeans_budget_counts.png'
    plt.savefig(counts_path, dpi=150)
    plt.close()

    # Boxplot: price distribution per budget category
    plt.figure(figsize=(8, 6))
    sns.boxplot(x='budget_category', y='price', data=df, order=order, palette='muted')
    plt.ylabel('Price')
    plt.xlabel('Budget Category')
    plt.title('Price Distribution by Budget Category (kmeans)')
    plt.tight_layout()
    box_path = out_dir / 'kmeans_budget_boxplot.png'
    plt.savefig(box_path, dpi=150)
    plt.close()

    print(f"Saved: {counts_path}")
    print(f"Saved: {box_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Plot kmeans budget segments')
    parser.add_argument('--out', help='Optional output directory for plots')
    args = parser.parse_args()
    main(args.out)
