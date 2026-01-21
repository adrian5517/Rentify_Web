#!/usr/bin/env python3
from pathlib import Path
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def main():
    repo_root = Path(__file__).resolve().parent.parent
    eval_path = repo_root / 'ml-output' / 'knn_evaluation.csv'
    rec_path = repo_root / 'ml-output' / 'property_recommendations.csv'
    out_path = repo_root / 'ml-output' / 'knn_viz.html'

    if not eval_path.exists():
        print(f"Data file not found: {eval_path}")
        return 1

    df_eval = pd.read_csv(eval_path)

    # numeric conversion
    df_eval['actual_price'] = pd.to_numeric(df_eval['actual_price'], errors='coerce')
    df_eval['predicted_price'] = pd.to_numeric(df_eval['predicted_price'], errors='coerce')
    if 'error_percent' in df_eval.columns:
        df_eval['error_percent'] = pd.to_numeric(df_eval['error_percent'], errors='coerce')
    else:
        df_eval['error_percent'] = (df_eval['predicted_price'] - df_eval['actual_price']).abs() / df_eval['actual_price'] * 100

    df_eval['abs_error'] = (df_eval['predicted_price'] - df_eval['actual_price']).abs()

    # Merge with recommendations if available
    if rec_path.exists():
        df_rec = pd.read_csv(rec_path)
        if 'original_index' in df_eval.columns and 'original_index' in df_rec.columns:
            df = pd.merge(df_eval, df_rec[['original_index','price_range']], on='original_index', how='left')
        else:
            df = pd.merge(df_eval, df_rec[['property_name','price_range']], on='property_name', how='left')
        df['price_range'] = df['price_range'].fillna('Unknown')
    else:
        df = df_eval.copy()
        df['price_range'] = 'Unknown'

    # Do NOT filter Unknown now — make visualization even without recommendations

    # Prepare hover text
    df['hover'] = df.apply(lambda r: f"{r.get('property_name','')}<br>Actual: {int(r.get('actual_price')) if pd.notna(r.get('actual_price')) else ''}<br>Predicted: {int(r.get('predicted_price')) if pd.notna(r.get('predicted_price')) else ''}<br>Error%: {r.get('error_percent'):.1f}%", axis=1)

    specs = [[{"type":"xy"}], [{"type":"xy"}], [{"type":"table"}]]
    fig = make_subplots(rows=3, cols=1, specs=specs, subplot_titles=("Actual vs Predicted Price (KNN)", "Error % Distribution", "Top errors (by %)") , row_heights=[0.5,0.2,0.3])

    scatter = px.scatter(df, x='actual_price', y='predicted_price', color='error_percent', color_continuous_scale='RdYlGn_r', hover_name='property_name', hover_data=['address','error_percent'], labels={'actual_price':'Actual Price','predicted_price':'Predicted Price','error_percent':'Error %'})
    for trace in scatter.data:
        fig.add_trace(trace, row=1, col=1)

    valid = df.dropna(subset=['actual_price','predicted_price'])
    if not valid.empty:
        minp = min(valid['actual_price'].min(), valid['predicted_price'].min())
        maxp = max(valid['actual_price'].max(), valid['predicted_price'].max())
        fig.add_trace(go.Scatter(x=[minp,maxp], y=[minp,maxp], mode='lines', line=dict(color='black', dash='dash'), name='y=x'), row=1, col=1)

    hist = px.histogram(df, x='error_percent', nbins=20, labels={'error_percent':'Error %'})
    for trace in hist.data:
        fig.add_trace(trace, row=2, col=1)

    table_df = df.sort_values('error_percent', ascending=False).head(20)
    table = go.Table(header=dict(values=['Property','Actual','Predicted','Error %','Price Range'], fill_color='lightgrey'), cells=dict(values=[table_df['property_name'].fillna(''), table_df['actual_price'].map(lambda v: f"{int(v):,}" if pd.notna(v) else ''), table_df['predicted_price'].map(lambda v: f"{int(v):,}" if pd.notna(v) else ''), table_df['error_percent'].map(lambda v: f"{v:.1f}%" if pd.notna(v) else ''), table_df['price_range'].fillna('')], align='left'))
    fig.add_trace(table, row=3, col=1)

    fig.update_layout(height=1000, title_text='KNN Visualization (simplified)')
    fig.update_xaxes(title_text='Actual Price', row=1, col=1)
    fig.update_yaxes(title_text='Predicted Price', row=1, col=1)
    fig.update_xaxes(title_text='Error %', row=2, col=1)

    fig.write_html(out_path, include_plotlyjs='cdn')
    print(f"Wrote: {out_path}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
