# gcloud cheat sheet

A static, zero-dependency cheat sheet for the Google Cloud CLI. It has a short description, use cases and ready-to-copy `gcloud` / `bq` commands for:

- **Getting started**: install, auth, configurations, projects, output formatting
- **Storage & databases**: Cloud Storage, Firestore/Firebase, BigQuery, Cloud SQL, Spanner, Bigtable, Filestore, Memorystore
- **Compute**: VMs, Cloud Run, Cloud Functions, GKE, App Engine, Artifact Registry, Cloud Build
- **IAM & access**: policies, roles, service accounts, impersonation, Workload Identity Federation, org policies, troubleshooting
- **Data exchange**: Analytics Hub, Pub/Sub, Storage Transfer, Datastream, Dataflow, Dataproc, BigQuery Data Transfer
- **APIs & services**: enabling APIs, API keys, quotas, API Gateway, REST calls
- **Gemini AI**: setup, text and JSON generation, image understanding, image generation/editing, Python SDK, AI Studio keys
- **Examples**: three complete apps with full source code and deploy runbooks:
  - Bookstore: Cloud Run, Cloud SQL, Pub/Sub → BigQuery, Gemini
  - Petshop: Cloud Functions, Firestore, API Gateway, Gemini vision
  - Image storage: signed URLs, Eventarc, Gemini tagging and variants, Analytics Hub, Workload Identity Federation

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

The example apps live as real files in `examples/<app>/`, and each has a `meta.mjs` with its page text and commands.
`js/data/examples.js` is generated from them, so regenerate it after editing:

```sh
node tools/gen-examples.mjs
```

## Checking commands

`tools/extract-cli.mjs` pulls every `gcloud` / `bq` call out of the site data. `tools/check-cli.py` then
checks the command paths and flags against the real CLI, using `--help` inside the official image:

```sh
mkdir -p /tmp/cli && node tools/extract-cli.mjs > /tmp/cli/calls.json && cp tools/check-cli.py /tmp/cli/
docker run --rm -v /tmp/cli:/w gcr.io/google.com/cloudsdktool/google-cloud-cli:stable sh -c \
  'gcloud meta cli-trees update --commands=bq --directory=/w >/dev/null && python3 /w/check-cli.py /w/calls.json /w/bq.json'
```
