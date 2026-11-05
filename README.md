# gcloud cheat sheet

A static, zero-dependency cheat sheet for the Google Cloud CLI. It has a short description, use cases and ready-to-copy `gcloud` / `bq` commands for:

- **Getting started**: install, auth, configurations, projects, output formatting
- **Storage & databases**: Cloud Storage, Firestore/Firebase, BigQuery, Cloud SQL, Spanner, Bigtable, Filestore, Memorystore
- **Compute**: VMs, Cloud Run, Cloud Functions, GKE, App Engine, Artifact Registry, Cloud Build
- **IAM & access**: policies, roles, service accounts, impersonation, Workload Identity Federation, org policies, troubleshooting
- **Data exchange**: Analytics Hub, Pub/Sub, Storage Transfer, Datastream, Dataflow, Dataproc, BigQuery Data Transfer
- **APIs & services**: enabling APIs, API keys, quotas, API Gateway, REST calls

## Run

```sh
docker build -t gcloud-cheatsheet .
docker run --rm -p 8080:80 gcloud-cheatsheet
# open http://localhost:8080
```

There is no build step. For local development, serve the folder with any static server, e.g. `python3 -m http.server`.

## Editing content

Each topic is one module in `js/data/` (the shape is documented in `js/data/index.js`).
Pictograms are inline SVGs in `js/icons.js`, referenced by name.
