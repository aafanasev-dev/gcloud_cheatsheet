export default {
  id: 'storage',
  title: 'Storage & databases',
  icon: 'database',
  color: 'storage',
  description: 'Object storage, document and relational databases, the BigQuery warehouse and in-memory caches: where your data lives.',
  useCases: [
    'Hosting files, backups and static assets in buckets',
    'App data in Firestore, Cloud SQL or Spanner',
    'Analytics over large datasets with BigQuery',
    'Low-latency caches and wide-column workloads (Memorystore, Bigtable)',
  ],
  subtopics: [
    {
      id: 'buckets',
      title: 'Cloud Storage buckets',
      icon: 'bucket',
      summary: 'Object storage: buckets, objects, lifecycle, signed URLs.',
      description: 'Durable object storage for any kind of file. Use `gcloud storage` (the successor to `gsutil`). Objects are addressed as `gs://BUCKET/path`.',
      useCases: ['Backups, data lake files and ML datasets', 'Static website or CDN origin', 'Sharing a file for a limited time with signed URLs'],
      sections: [
        {
          title: 'Buckets',
          cmds: [
            { d: 'Create a bucket with uniform access and a storage class', c: 'gcloud storage buckets create gs://BUCKET_NAME --location=EU --default-storage-class=STANDARD --uniform-bucket-level-access' },
            { d: 'List buckets', c: 'gcloud storage buckets list --format="table(name, location, storageClass)"' },
            { d: 'Describe a bucket', c: 'gcloud storage buckets describe gs://BUCKET_NAME' },
            { d: 'Turn on versioning and block public access', c: 'gcloud storage buckets update gs://BUCKET_NAME --versioning --public-access-prevention' },
            { d: 'Apply a lifecycle policy from JSON', c: 'gcloud storage buckets update gs://BUCKET_NAME --lifecycle-file=lifecycle.json' },
            { d: 'Delete a bucket and everything in it', c: 'gcloud storage rm --recursive gs://BUCKET_NAME' },
          ],
        },
        {
          title: 'Objects',
          cmds: [
            { d: 'Upload / download files', c: 'gcloud storage cp ./report.pdf gs://BUCKET_NAME/docs/\ngcloud storage cp gs://BUCKET_NAME/docs/report.pdf .' },
            { d: 'Copy a folder recursively', c: 'gcloud storage cp --recursive ./site gs://BUCKET_NAME/' },
            { d: 'List objects with size and date', c: 'gcloud storage ls --long --readable-sizes gs://BUCKET_NAME/docs/' },
            { d: 'Sync a local directory to a bucket (mirror, delete extras)', c: 'gcloud storage rsync ./build gs://BUCKET_NAME --recursive --delete-unmatched-destination-objects' },
            { d: 'Move / rename an object', c: 'gcloud storage mv gs://BUCKET_NAME/old.txt gs://BUCKET_NAME/new.txt' },
            { d: 'Print an object to stdout', c: 'gcloud storage cat gs://BUCKET_NAME/config.json' },
            { d: 'Total size of a prefix', c: 'gcloud storage du --summarize --readable-sizes gs://BUCKET_NAME/logs/' },
            { d: 'Set metadata (cache-control, content-type)', c: 'gcloud storage objects update gs://BUCKET_NAME/index.html --cache-control="no-cache" --content-type=text/html' },
          ],
        },
        {
          title: 'Access & sharing',
          cmds: [
            { d: 'Grant read access on a bucket', c: 'gcloud storage buckets add-iam-policy-binding gs://BUCKET_NAME --member=user:alice@example.com --role=roles/storage.objectViewer' },
            { d: 'Make a bucket public (static website)', c: 'gcloud storage buckets add-iam-policy-binding gs://BUCKET_NAME --member=allUsers --role=roles/storage.objectViewer' },
            { d: 'Configure website main / 404 page', c: 'gcloud storage buckets update gs://BUCKET_NAME --web-main-page-suffix=index.html --web-error-page=404.html' },
            { d: 'Create a signed URL valid for 1 hour', c: 'gcloud storage sign-url gs://BUCKET_NAME/file.zip --duration=1h --impersonate-service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
          ],
        },
      ],
    },
    {
      id: 'firestore',
      title: 'Firestore & Firebase',
      icon: 'flame',
      summary: 'Serverless NoSQL document DB, indexes, import/export.',
      description: 'Firestore is the document database behind Firebase. `gcloud firestore` manages databases, indexes and backups; the `firebase` CLI handles rules, hosting and the local emulator.',
      useCases: ['Mobile/web app backends with realtime sync', 'Exporting a database to Cloud Storage for backup or BigQuery', 'Deploying security rules and Firebase Hosting'],
      sections: [
        {
          title: 'Databases',
          cmds: [
            { d: 'Create the default Firestore database (Native mode)', c: 'gcloud firestore databases create --location=eur3 --type=firestore-native' },
            { d: 'Create a named database', c: 'gcloud firestore databases create --database=orders --location=europe-west1' },
            { d: 'List databases', c: 'gcloud firestore databases list' },
            { d: 'Enable delete protection', c: 'gcloud firestore databases update --database=orders --delete-protection' },
          ],
        },
        {
          title: 'Indexes',
          cmds: [
            { d: 'List composite indexes', c: 'gcloud firestore indexes composite list' },
            { d: 'Create a composite index', c: 'gcloud firestore indexes composite create --collection-group=orders \\\n  --field-config=field-path=status,order=ascending \\\n  --field-config=field-path=createdAt,order=descending' },
            { d: 'Set a TTL policy on a field', c: 'gcloud firestore fields ttls update expireAt --collection-group=sessions --enable-ttl' },
          ],
        },
        {
          title: 'Backup, export & import',
          cmds: [
            { d: 'Export all documents to a bucket', c: 'gcloud firestore export gs://BUCKET_NAME/firestore-backup' },
            { d: 'Export specific collections', c: 'gcloud firestore export gs://BUCKET_NAME/backup --collection-ids=users,orders' },
            { d: 'Import an export', c: 'gcloud firestore import gs://BUCKET_NAME/firestore-backup/2026-01-01T00:00:00_12345' },
            { d: 'Daily scheduled backups kept for 7 days', c: 'gcloud firestore backups schedules create --database="(default)" --recurrence=daily --retention=7d' },
          ],
        },
        {
          title: 'Firebase CLI',
          note: 'Install with `npm install -g firebase-tools`. It reuses your Google login.',
          cmds: [
            { d: 'Log in and link a project', c: 'firebase login\nfirebase use --add PROJECT_ID' },
            { d: 'Add Firebase to an existing GCP project', c: 'firebase projects:addfirebase PROJECT_ID' },
            { d: 'Deploy rules / hosting / functions', c: 'firebase deploy --only firestore:rules,hosting' },
            { d: 'Run local emulators', c: 'firebase emulators:start --only firestore,auth' },
          ],
        },
      ],
    },
    {
      id: 'bigquery',
      title: 'BigQuery',
      icon: 'chart',
      summary: 'Serverless data warehouse: datasets, tables, SQL, load/extract.',
      description: 'A serverless analytics warehouse queried with SQL. The `bq` CLI (installed with gcloud) covers datasets, tables, queries and load jobs.',
      useCases: ['Ad-hoc SQL over terabytes', 'Loading CSV/Parquet from Cloud Storage', 'BI dashboards and scheduled reporting'],
      sections: [
        {
          title: 'Datasets & tables',
          cmds: [
            { d: 'Create a dataset in a location', c: 'bq --location=EU mk --dataset PROJECT_ID:DATASET' },
            { d: 'List datasets / tables', c: 'bq ls\nbq ls PROJECT_ID:DATASET' },
            { d: 'Show table schema and details', c: 'bq show --schema --format=prettyjson DATASET.TABLE' },
            { d: 'Create a table with an inline schema, partitioned by day', c: 'bq mk --table --time_partitioning_field=created_at DATASET.events id:STRING,user_id:STRING,created_at:TIMESTAMP' },
            { d: 'Copy a table', c: 'bq cp DATASET.TABLE DATASET.TABLE_backup' },
            { d: 'Delete a table / dataset', c: 'bq rm -t DATASET.TABLE\nbq rm -r -d DATASET' },
          ],
        },
        {
          title: 'Query',
          cmds: [
            { d: 'Run a Standard SQL query', c: 'bq query --use_legacy_sql=false \'SELECT name, COUNT(*) AS n FROM `PROJECT_ID.DATASET.TABLE` GROUP BY name ORDER BY n DESC LIMIT 10\'' },
            { d: 'Estimate bytes scanned (dry run)', c: 'bq query --use_legacy_sql=false --dry_run \'SELECT * FROM `DATASET.TABLE`\'' },
            { d: 'Write results to a table', c: 'bq query --use_legacy_sql=false --destination_table=DATASET.daily_summary --replace \'SELECT ...\'' },
            { d: 'Preview rows without running a query (free)', c: 'bq head -n 20 DATASET.TABLE' },
            { d: 'List recent jobs', c: 'bq ls -j -n 10' },
          ],
        },
        {
          title: 'Load & export',
          cmds: [
            { d: 'Load CSV from Cloud Storage with schema auto-detect', c: 'bq load --source_format=CSV --autodetect --skip_leading_rows=1 DATASET.TABLE gs://BUCKET_NAME/data/*.csv' },
            { d: 'Load Parquet', c: 'bq load --source_format=PARQUET DATASET.TABLE gs://BUCKET_NAME/data/*.parquet' },
            { d: 'Export a table to Cloud Storage', c: 'bq extract --destination_format=PARQUET DATASET.TABLE gs://BUCKET_NAME/export/part-*.parquet' },
            { d: 'Create an external table over GCS files', c: 'bq mkdef --source_format=PARQUET "gs://BUCKET_NAME/data/*.parquet" > def.json\nbq mk --table --external_table_definition=def.json DATASET.ext_table' },
          ],
        },
      ],
    },
    {
      id: 'cloudsql',
      title: 'Cloud SQL',
      icon: 'sql',
      summary: 'Managed MySQL, PostgreSQL and SQL Server.',
      description: 'Fully managed relational databases with automated backups, replicas and high availability.',
      useCases: ['A Postgres/MySQL backend for web apps', 'Lift-and-shift of an on-prem database', 'Read replicas for reporting'],
      sections: [
        {
          title: 'Instances',
          cmds: [
            { d: 'Create a PostgreSQL instance', c: 'gcloud sql instances create INSTANCE_NAME --database-version=POSTGRES_16 --tier=db-custom-2-7680 --region=europe-west1' },
            { d: 'List / describe instances', c: 'gcloud sql instances list\ngcloud sql instances describe INSTANCE_NAME' },
            { d: 'Turn on high availability', c: 'gcloud sql instances patch INSTANCE_NAME --availability-type=REGIONAL' },
            { d: 'Create a read replica', c: 'gcloud sql instances create INSTANCE_NAME-replica --master-instance-name=INSTANCE_NAME' },
            { d: 'Stop / start (activation policy)', c: 'gcloud sql instances patch INSTANCE_NAME --activation-policy=NEVER\ngcloud sql instances patch INSTANCE_NAME --activation-policy=ALWAYS' },
          ],
        },
        {
          title: 'Databases & users',
          cmds: [
            { d: 'Create a database', c: 'gcloud sql databases create appdb --instance=INSTANCE_NAME' },
            { d: 'Create a user', c: 'gcloud sql users create appuser --instance=INSTANCE_NAME --password=CHANGE_ME' },
            { d: 'Connect with psql through the Cloud SQL proxy', c: 'gcloud sql connect INSTANCE_NAME --user=postgres --database=appdb' },
          ],
        },
        {
          title: 'Backup, import & export',
          cmds: [
            { d: 'On-demand backup', c: 'gcloud sql backups create --instance=INSTANCE_NAME' },
            { d: 'List / restore backups', c: 'gcloud sql backups list --instance=INSTANCE_NAME\ngcloud sql backups restore BACKUP_ID --restore-instance=INSTANCE_NAME' },
            { d: 'Export SQL dump to a bucket', c: 'gcloud sql export sql INSTANCE_NAME gs://BUCKET_NAME/dump.sql.gz --database=appdb' },
            { d: 'Import a SQL dump', c: 'gcloud sql import sql INSTANCE_NAME gs://BUCKET_NAME/dump.sql.gz --database=appdb' },
          ],
        },
      ],
    },
    {
      id: 'spanner',
      title: 'Spanner',
      icon: 'globe',
      summary: 'Globally consistent, horizontally scalable SQL database.',
      description: 'A relational database that scales horizontally with strong consistency across regions. Capacity is set in nodes or processing units.',
      useCases: ['Global financial or inventory systems', 'Outgrowing a single Cloud SQL instance', 'Multi-region with 99.999% availability'],
      sections: [
        {
          title: 'Instances & databases',
          cmds: [
            { d: 'Create an instance with 100 processing units', c: 'gcloud spanner instances create INSTANCE_NAME --config=regional-europe-west1 --description="App DB" --processing-units=100' },
            { d: 'Scale an instance', c: 'gcloud spanner instances update INSTANCE_NAME --nodes=3' },
            { d: 'Create a database with DDL', c: 'gcloud spanner databases create appdb --instance=INSTANCE_NAME \\\n  --ddl="CREATE TABLE Users (UserId STRING(36) NOT NULL, Name STRING(MAX)) PRIMARY KEY (UserId)"' },
            { d: 'Update the schema', c: 'gcloud spanner databases ddl update appdb --instance=INSTANCE_NAME --ddl="CREATE INDEX UsersByName ON Users(Name)"' },
            { d: 'Run a SQL query', c: 'gcloud spanner databases execute-sql appdb --instance=INSTANCE_NAME --sql="SELECT * FROM Users LIMIT 10"' },
            { d: 'Create a backup', c: 'gcloud spanner backups create appdb-bk --instance=INSTANCE_NAME --database=appdb --retention-period=7d' },
          ],
        },
      ],
    },
    {
      id: 'bigtable',
      title: 'Bigtable',
      icon: 'table',
      summary: 'Wide-column NoSQL for huge, low-latency workloads.',
      description: 'An HBase-compatible wide-column store for very high read/write throughput: time series, IoT, ad tech. Use `cbt` for table-level operations.',
      useCases: ['Time series and IoT telemetry', 'Personalisation / feature stores', 'Large-scale key/value lookups'],
      sections: [
        {
          title: 'Instances',
          cmds: [
            { d: 'Create an instance with one cluster', c: 'gcloud bigtable instances create INSTANCE_NAME --display-name="Metrics" \\\n  --cluster-config=id=INSTANCE_NAME-c1,zone=europe-west1-b,nodes=1' },
            { d: 'List instances and clusters', c: 'gcloud bigtable instances list\ngcloud bigtable clusters list --instances=INSTANCE_NAME' },
            { d: 'Enable autoscaling on a cluster', c: 'gcloud bigtable clusters update INSTANCE_NAME-c1 --instance=INSTANCE_NAME --autoscaling-min-nodes=1 --autoscaling-max-nodes=5 --autoscaling-cpu-target=60' },
          ],
        },
        {
          title: 'Tables (cbt)',
          note: 'Install with `gcloud components install cbt`.',
          cmds: [
            { d: 'Create a table and a column family', c: 'cbt -project PROJECT_ID -instance INSTANCE_NAME createtable metrics\ncbt -project PROJECT_ID -instance INSTANCE_NAME createfamily metrics cf1' },
            { d: 'Write and read a cell', c: 'cbt -instance INSTANCE_NAME set metrics row1 cf1:temp=21.5\ncbt -instance INSTANCE_NAME read metrics count=10' },
          ],
        },
      ],
    },
    {
      id: 'filestore',
      title: 'Filestore',
      icon: 'files',
      summary: 'Managed NFS file shares for VMs and GKE.',
      description: 'Managed NFSv3/v4.1 file servers. Mount a share from Compute Engine or GKE when an app needs a POSIX file system.',
      useCases: ['Shared home directories or media files', 'Lift-and-shift apps that expect NFS', 'ReadWriteMany volumes for GKE'],
      sections: [
        {
          title: 'Instances',
          cmds: [
            { d: 'Create a 1 TiB basic HDD share', c: 'gcloud filestore instances create INSTANCE_NAME --zone=europe-west1-b --tier=BASIC_HDD \\\n  --file-share=name=vol1,capacity=1TB --network=name=default' },
            { d: 'Get the IP to mount', c: 'gcloud filestore instances describe INSTANCE_NAME --zone=europe-west1-b --format="value(networks[0].ipAddresses[0])"' },
            { d: 'Mount on a VM', c: 'sudo apt-get install -y nfs-common\nsudo mkdir -p /mnt/vol1 && sudo mount FILESTORE_IP:/vol1 /mnt/vol1' },
            { d: 'Create a backup', c: 'gcloud filestore backups create vol1-bk --instance=INSTANCE_NAME --instance-zone=europe-west1-b --file-share=vol1 --region=europe-west1' },
          ],
        },
      ],
    },
    {
      id: 'memorystore',
      title: 'Memorystore',
      icon: 'bolt',
      summary: 'Managed Redis / Valkey / Memcached caches.',
      description: 'In-memory data stores for caching, sessions and leaderboards, reachable on a private IP in your VPC.',
      useCases: ['Caching DB results and HTTP responses', 'Session storage', 'Rate limiting and pub/sub'],
      sections: [
        {
          title: 'Redis',
          cmds: [
            { d: 'Create a 1 GB Standard (HA) Redis instance', c: 'gcloud redis instances create INSTANCE_NAME --size=1 --region=europe-west1 --tier=standard --redis-version=redis_7_2' },
            { d: 'Get host and port', c: 'gcloud redis instances describe INSTANCE_NAME --region=europe-west1 --format="value(host,port)"' },
            { d: 'Resize', c: 'gcloud redis instances update INSTANCE_NAME --region=europe-west1 --size=5' },
            { d: 'Export an RDB snapshot to GCS', c: 'gcloud redis instances export gs://BUCKET_NAME/redis.rdb INSTANCE_NAME --region=europe-west1' },
            { d: 'Delete', c: 'gcloud redis instances delete INSTANCE_NAME --region=europe-west1' },
          ],
        },
      ],
    },
  ],
};
