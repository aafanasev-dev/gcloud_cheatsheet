export default {
  id: 'start',
  title: 'Getting started',
  icon: 'rocket',
  color: 'start',
  description: 'Install the Google Cloud CLI, sign in, choose a project and learn the output flags that every other command shares.',
  useCases: [
    'Setting up a new workstation or CI runner to talk to Google Cloud',
    'Switching quickly between personal, staging and production projects',
    'Scripting: getting clean values out of `gcloud` with `--format` and `--filter`',
  ],
  subtopics: [
    {
      id: 'install',
      title: 'Install & init',
      icon: 'terminal',
      summary: 'Install the SDK, components and run first-time setup.',
      description: 'The Google Cloud CLI ships `gcloud`, `gsutil` (legacy) and `bq`. `gcloud init` walks you through login, project and default region.',
      useCases: ['First-time setup on a laptop', 'Adding alpha/beta or kubectl components', 'Keeping the CLI up to date'],
      sections: [
        {
          title: 'Install',
          cmds: [
            { d: 'Linux / macOS interactive installer', c: 'curl https://sdk.cloud.google.com | bash\nexec -l $SHELL' },
            { d: 'Debian / Ubuntu via apt', c: 'sudo apt-get install apt-transport-https ca-certificates gnupg curl\ncurl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg\necho "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list\nsudo apt-get update && sudo apt-get install google-cloud-cli' },
            { d: 'macOS with Homebrew', c: 'brew install --cask google-cloud-sdk' },
            { d: 'Run in Docker without installing', c: 'docker run --rm -it gcr.io/google.com/cloudsdktool/google-cloud-cli:stable gcloud version' },
          ],
        },
        {
          title: 'Initialise & maintain',
          cmds: [
            { d: 'Interactive setup: login, project, default region/zone', c: 'gcloud init' },
            { d: 'Show installed version and components', c: 'gcloud version' },
            { d: 'Diagnose installation, network and proxy problems', c: 'gcloud info --run-diagnostics' },
            { d: 'Update all components', c: 'gcloud components update' },
            { d: 'Install extra components (alpha/beta commands, kubectl, GKE auth plugin)', c: 'gcloud components install alpha beta kubectl gke-gcloud-auth-plugin' },
            { d: 'Help for any command', c: 'gcloud compute instances create --help\ngcloud help compute instances' },
          ],
        },
      ],
    },
    {
      id: 'auth',
      title: 'Authentication',
      icon: 'login',
      summary: 'User login, Application Default Credentials and service accounts.',
      description: 'Two kinds of credentials: the ones `gcloud` itself uses (`gcloud auth login`), and Application Default Credentials (ADC) that client libraries in your code pick up.',
      useCases: ['Signing in on a machine with or without a browser', 'Letting local code call Google APIs via ADC', 'Running as a service account in CI'],
      sections: [
        {
          title: 'gcloud credentials',
          cmds: [
            { d: 'Log in with your Google account (opens a browser)', c: 'gcloud auth login' },
            { d: 'Log in on a headless machine', c: 'gcloud auth login --no-browser' },
            { d: 'List credentialed accounts and see which one is active', c: 'gcloud auth list' },
            { d: 'Switch the active account', c: 'gcloud config set account USER@example.com' },
            { d: 'Revoke credentials', c: 'gcloud auth revoke USER@example.com' },
          ],
        },
        {
          title: 'Application Default Credentials (for your code)',
          cmds: [
            { d: 'Create ADC for local development', c: 'gcloud auth application-default login' },
            { d: 'Set the quota project used by ADC', c: 'gcloud auth application-default set-quota-project PROJECT_ID' },
            { d: 'Print an ADC access token', c: 'gcloud auth application-default print-access-token' },
            { d: 'Remove ADC', c: 'gcloud auth application-default revoke' },
          ],
        },
        {
          title: 'Service accounts & tokens',
          cmds: [
            { d: 'Activate a service account from a key file (prefer impersonation or WIF if you can)', c: 'gcloud auth activate-service-account --key-file=key.json' },
            { d: 'Run a single command as a service account (impersonation, no key file)', c: 'gcloud storage ls --impersonate-service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
            { d: 'Print an OAuth access token for REST calls', c: 'gcloud auth print-access-token' },
            { d: 'Print an identity token (e.g. for private Cloud Run)', c: 'gcloud auth print-identity-token --audiences=https://SERVICE-xyz.a.run.app' },
            { d: 'Configure Docker to push to Artifact Registry', c: 'gcloud auth configure-docker REGION-docker.pkg.dev' },
          ],
        },
      ],
    },
    {
      id: 'config',
      title: 'Configurations',
      icon: 'sliders',
      summary: 'Named profiles holding account, project, region and zone.',
      description: 'A configuration is a named set of properties. Create one per environment and switch with a single command, or override per call with `--project`, `--region`, `--zone`.',
      useCases: ['Keeping dev / prod settings apart', 'Setting default region and zone so you can drop flags', 'Overriding a setting for one command'],
      sections: [
        {
          title: 'Properties',
          cmds: [
            { d: 'Show the current properties', c: 'gcloud config list' },
            { d: 'Set default project, region and zone', c: 'gcloud config set project PROJECT_ID\ngcloud config set compute/region europe-west1\ngcloud config set compute/zone europe-west1-b' },
            { d: 'Read a single value (handy in scripts)', c: 'gcloud config get-value project' },
            { d: 'Unset a property', c: 'gcloud config unset compute/zone' },
            { d: 'Override per command with an environment variable', c: 'CLOUDSDK_CORE_PROJECT=other-project gcloud compute instances list' },
          ],
        },
        {
          title: 'Named configurations',
          cmds: [
            { d: 'Create and activate a new configuration', c: 'gcloud config configurations create prod' },
            { d: 'List configurations', c: 'gcloud config configurations list' },
            { d: 'Switch configuration', c: 'gcloud config configurations activate dev' },
            { d: 'Use a configuration for one command only', c: 'gcloud compute instances list --configuration=prod' },
            { d: 'Delete a configuration', c: 'gcloud config configurations delete old-config' },
          ],
        },
      ],
    },
    {
      id: 'projects',
      title: 'Projects & billing',
      icon: 'folder',
      summary: 'Create, list and link projects to billing accounts.',
      description: 'Every resource lives in a project. Projects sit under folders and an organization, and must be linked to a billing account before paid APIs work.',
      useCases: ['Spinning up a sandbox project', 'Finding a project number for IAM or API calls', 'Linking or unlinking billing'],
      sections: [
        {
          title: 'Projects',
          cmds: [
            { d: 'List projects you can access', c: 'gcloud projects list' },
            { d: 'Create a project (optionally under a folder or organization)', c: 'gcloud projects create PROJECT_ID --name="My Project" --folder=FOLDER_ID' },
            { d: 'Describe a project and get its number', c: 'gcloud projects describe PROJECT_ID --format="value(projectNumber)"' },
            { d: 'Add labels (label flags are in the alpha track)', c: 'gcloud alpha projects update PROJECT_ID --update-labels=env=dev,team=data' },
            { d: 'Delete (soft-delete for 30 days) and restore', c: 'gcloud projects delete PROJECT_ID\ngcloud projects undelete PROJECT_ID' },
          ],
        },
        {
          title: 'Billing',
          cmds: [
            { d: 'List billing accounts', c: 'gcloud billing accounts list' },
            { d: 'Link a project to a billing account', c: 'gcloud billing projects link PROJECT_ID --billing-account=XXXXXX-XXXXXX-XXXXXX' },
            { d: 'Check billing status for a project', c: 'gcloud billing projects describe PROJECT_ID' },
            { d: 'Create a budget alert', c: 'gcloud billing budgets create --billing-account=XXXXXX-XXXXXX-XXXXXX \\\n  --display-name="Monthly cap" --budget-amount=100USD \\\n  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9' },
          ],
        },
        {
          title: 'Organization & folders',
          cmds: [
            { d: 'List organizations', c: 'gcloud organizations list' },
            { d: 'List folders under an organization', c: 'gcloud resource-manager folders list --organization=ORG_ID' },
            { d: 'Create a folder', c: 'gcloud resource-manager folders create --display-name="Data team" --organization=ORG_ID' },
            { d: 'Move a project into a folder', c: 'gcloud beta projects move PROJECT_ID --folder=FOLDER_ID' },
          ],
        },
      ],
    },
    {
      id: 'output',
      title: 'Output, filter & format',
      icon: 'filter',
      summary: '--format, --filter, --limit, --sort-by and scripting tips.',
      description: 'Every `list`/`describe` command accepts the same output flags. Filtering happens on the server where possible, and formatting turns output into JSON, CSV or plain values for scripts.',
      useCases: ['Extracting an IP or ID into a shell variable', 'Exporting resources as JSON/CSV', 'Finding resources by label, status or name pattern'],
      sections: [
        {
          title: 'Formats',
          cmds: [
            { d: 'JSON / YAML output', c: 'gcloud compute instances list --format=json\ngcloud run services describe SERVICE --region=REGION --format=yaml' },
            { d: 'A custom table', c: 'gcloud compute instances list --format="table(name, zone.basename(), status, networkInterfaces[0].accessConfigs[0].natIP:label=EXTERNAL_IP)"' },
            { d: 'Raw values for scripts', c: 'IP=$(gcloud compute instances describe VM_NAME --zone=ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)")' },
            { d: 'CSV without header', c: 'gcloud projects list --format="csv[no-heading](projectId,projectNumber)"' },
            { d: 'Flatten nested lists', c: 'gcloud projects get-iam-policy PROJECT_ID --flatten="bindings[].members" --format="table(bindings.role, bindings.members)"' },
          ],
        },
        {
          title: 'Filter, sort, limit',
          cmds: [
            { d: 'Filter by field value', c: 'gcloud compute instances list --filter="status=RUNNING AND zone:europe-west1"' },
            { d: 'Filter by label and regex', c: 'gcloud compute instances list --filter="labels.env=prod AND name ~ ^web-"' },
            { d: 'Sort and limit', c: 'gcloud compute instances list --sort-by=~creationTimestamp --limit=5' },
            { d: 'Quiet mode: skip prompts (CI)', c: 'gcloud compute instances delete VM_NAME --zone=ZONE --quiet' },
            { d: 'See the HTTP calls a command makes', c: 'gcloud compute instances list --log-http' },
          ],
        },
      ],
    },
  ],
};
