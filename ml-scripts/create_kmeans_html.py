#!/usr/bin/env python3
from pathlib import Path
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def main():
    repo_root = Path(__file__).resolve().parent.parent
    data_path = repo_root / 'ml-output' / 'kmeans_clusters.csv'
    out_path = repo_root / 'ml-output' / 'kmeans_viz.html'

    if not data_path.exists():
        print(f"Data file not found: {data_path}")
        return 1

    df = pd.read_csv(data_path)
    df['price'] = pd.to_numeric(df['price'], errors='coerce')

    # Use budget_category if available, else map cluster_label
    if 'budget_category' in df.columns and not df['budget_category'].isnull().all():
        df['category'] = df['budget_category']
    elif 'cluster_label' in df.columns:
        mapping = {0: 'Low Budget', 1: 'Mid-Range', 2: 'High-End'}
        df['category'] = df['cluster_label'].map(mapping)
    else:
        df['category'] = 'Unknown'

    # Remove rows with unknown category to keep the visualization clear
    before = len(df)
    df = df[df['category'] != 'Unknown']
    after = len(df)
    if after == 0:
        print('No labeled categories found after filtering Unknown. Nothing to plot.')
        return 1

    order = ['Low Budget', 'Mid-Range', 'High-End']

    # Prepare hover text
    df['hover'] = df.apply(lambda r: f"{r.get('property_name','')}<br>Price: {r.get('price')}<br>{r.get('address','')}", axis=1)

    # Create subplots: scatter (index vs price), bar (counts), box (price by category)
    fig = make_subplots(rows=3, cols=1, subplot_titles=("Price scatter (by property)", "Counts per category", "Price distribution by category"), row_heights=[0.45, 0.15, 0.4])

    # Scatter: use original_index or dataframe index as x
    x_col = 'original_index' if 'original_index' in df.columns else df.index
    scatter = px.scatter(df, x=x_col, y='price', color='category', hover_name='property_name', hover_data=['address'], category_orders={'category': order})
    for trace in scatter.data:
        fig.add_trace(trace, row=1, col=1)

    # Bar: counts
    counts = df['category'].value_counts().reindex(order).fillna(0)
    bar = go.Bar(x=counts.index, y=counts.values, marker_color=['#66c2a5','#fc8d62','#8da0cb'])
    fig.add_trace(bar, row=2, col=1)

    # Box: price distribution
    box = px.box(df, x='category', y='price', category_orders={'category': order}, points='all')
    for trace in box.data:
        fig.add_trace(trace, row=3, col=1)

    fig.update_layout(height=1000, showlegend=True, title_text='KMeans Budget Visualization (interactive)')
    fig.update_xaxes(title_text='Property index', row=1, col=1)
    fig.update_yaxes(title_text='Price', row=1, col=1)
    fig.update_yaxes(title_text='Count', row=2, col=1)
    fig.update_xaxes(title_text='Category', row=3, col=1)
    fig.update_yaxes(title_text='Price', row=3, col=1)

    # Save HTML
    fig.write_html(out_path, include_plotlyjs='cdn')
    print(f"Wrote: {out_path}")
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
