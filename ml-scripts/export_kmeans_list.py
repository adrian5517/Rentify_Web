#!/usr/bin/env python3
from pathlib import Path
import pandas as pd


def format_price(p):
    try:
        p = float(p)
        if p.is_integer():
            return f"{int(p):,}"
        return f"{p:,.2f}"
    except Exception:
        return str(p)


def main():
    repo_root = Path(__file__).resolve().parent.parent
    data_path = repo_root / 'ml-output' / 'kmeans_clusters.csv'
    out_path = repo_root / 'ml-output' / 'kmeans_grouped.md'

    if not data_path.exists():
        print(f"Data file not found: {data_path}")
        return 1

    df = pd.read_csv(data_path)
    df['price'] = pd.to_numeric(df['price'], errors='coerce')

    # Prefer human-friendly budget_category if available
    if 'budget_category' in df.columns and not df['budget_category'].isnull().all():
        group_col = 'budget_category'
    elif 'cluster_label' in df.columns:
        group_col = 'cluster_label'
    else:
        group_col = None

    order = ['Low Budget', 'Mid-Range', 'High-End']

    lines = ["# KMeans Clustered Properties\n"]

    if group_col:
        # If group_col is numeric labels, map when possible
        if group_col == 'cluster_label':
            mapping = {0: 'Low Budget', 1: 'Mid-Range', 2: 'High-End'}
            df['cluster_label_mapped'] = df['cluster_label'].map(mapping)
            use_col = 'cluster_label_mapped'
        else:
            use_col = group_col
        # Remove Unknown groups so the output is easier to read
        if use_col in df.columns:
            df = df[df[use_col] != 'Unknown']

        # Iterate in the desired order if labels available
        present = [g for g in order if g in df[use_col].unique()]
        for cat in order:
            group = df[df[use_col] == cat]
            if group.empty:
                continue
            lines.append(f"## {cat} ({len(group)})\n")
            # sort by price ascending
            group_sorted = group.sort_values('price', na_position='last')
            for _, row in group_sorted.iterrows():
                name = row.get('property_name') or row.get('property') or ''
                price = format_price(row.get('price'))
                lines.append(f"- {name} — {price}\n")
            lines.append("\n")
    else:
        # No grouping available, just list all
        lines.append("## All properties\n\n")
        for _, row in df.sort_values('price', na_position='last').iterrows():
            name = row.get('property_name') or row.get('property') or ''
            price = format_price(row.get('price'))
            lines.append(f"- {name} — {price}\n")

    out_path.write_text('\n'.join(lines), encoding='utf-8')
    print(f"Wrote: {out_path}")
    # Also print a short summary to console
    counts = df[use_col].value_counts() if group_col else None
    if counts is not None:
        print('\nCategory counts:')
        for k,v in counts.items():
            print(f"{k}: {v}")
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
