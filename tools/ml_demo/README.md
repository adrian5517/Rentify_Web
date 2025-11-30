ML Demo - KNN Recommendation, KMeans Clustering, Accuracy Test

This small demo showcases:
- A simple KNN-based recommendation example (user-based)
- KMeans clustering visualization for 2D data
- Accuracy test for KNeighborsClassifier across different k values

What it produces
- `output/knn_recommendation.png` — bar chart of top recommendations for a sample user
- `output/kmeans_clusters.png` — scatter plot of clusters with centroids
- `output/accuracy_test.png` — accuracy vs k plot for KNN on Iris dataset

Quick start
1. Create a virtual environment (optional but recommended):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run the demo

```powershell
python ml_demo.py
```

Optional: generate a reliable JSON export from your TypeScript property file first

1. Run the exporter (no extra packages required):

```powershell
node export_properties.js
```

2. This will create `tools/ml_demo/property-data.json` which the demo will prefer when present.

Note: The exporter uses a simple heuristic parser and worked with the repository's `lib/property-data.ts` format. For more robust exports consider generating JSON from your backend directly.

Posting payloads to ML API / ML Proxy
------------------------------------

You can post the generated payloads to either your local Next.js ML proxy (`/api/ml-predict`) or the remote ML API. A helper script is included:

`tools/ml_demo/post_payloads.js` — requires Node.js and `node-fetch` (if you don't have it installed globally, run `npm install node-fetch` in this folder).

Examples:

Post all payloads to the local ML proxy:

```powershell
node post_payloads.js --target local --mode all
```

Post all payloads to the remote ML API:

```powershell
node post_payloads.js --target remote --mode all
```

Post one payload by id to local proxy:

```powershell
node post_payloads.js --target local --mode one <PROPERTY_ID>
```

Responses are saved to `tools/ml_demo/predictions.json`.

Quick curl example (single payload):

```powershell
curl -X POST http://localhost:3000/api/ml-predict -H "Content-Type: application/json" -d "{\"price\":12000,\"latitude\":13.6195,\"longitude\":123.1889}"
```


3. Open the PNG files in `output/`.

Suggestions for non-technical users (how to present training):
- Use a short slide or story for each plot: what input it used, what the model tried to do, and the "meaning" of colors/scores.
- Show the KMeans scatter with a caption: "These items are similar and grouped together — we call them a "group."" Use the legend to map colors to human-friendly labels.
- For recommendations: show the list of recommended items and a short sentence: "We predict these items match your taste. Higher score = more likely to like." Display the bar chart alongside the textual list.
- For accuracy test: explain accuracy as "how often the model guessed right" and highlight the best k with a callout.
- Add hoverable charts for web demos (Plotly) to let non-technical users hover and see exact values.
- Consider converting charts into PNGs with large fonts and embedding them into an email or slide deck with a 1-line explanation under each.

If you want, I can:
- Convert plots to interactive Plotly HTML for embedding in a web page
- Hook the demo up to a real dataset from your project and label items with real names
- Create a small PowerPoint/HTML report that combines the 3 charts with explanatory text

