export default {
  id: 'iam',
  title: 'IAM & access',
  icon: 'shield',
  color: 'iam',
  description: 'Who can do what on which resource. Principals (users, groups, service accounts) get roles through bindings in an allow policy on an organization, folder, project or resource.',
  useCases: [
    'Granting least-privilege access to people and workloads',
    'Running workloads as service accounts without key files',
    'Letting GitHub Actions / AWS / on-prem authenticate via federation',
    'Enforcing guardrails with organization policies',
  ],
  subtopics: [
    {
      id: 'policies',
      title: 'IAM policies & bindings',
      icon: 'idcard',
      summary: 'Grant, revoke and inspect role bindings.',
      description: 'An allow policy is a list of bindings, each a role plus members. Use `add-iam-policy-binding` / `remove-iam-policy-binding` rather than editing whole policies.',
      useCases: ['Giving a teammate access to a project', 'Auditing who has Owner/Editor', 'Time-limited access with IAM conditions'],
      sections: [
        {
          title: 'Project level',
          note: 'Member formats: `user:EMAIL`, `group:EMAIL`, `serviceAccount:EMAIL`, `domain:example.com`, `principal://…` (federation).',
          cmds: [
            { d: 'Grant a role', c: 'gcloud projects add-iam-policy-binding PROJECT_ID --member=user:alice@example.com --role=roles/viewer' },
            { d: 'Revoke a role', c: 'gcloud projects remove-iam-policy-binding PROJECT_ID --member=user:alice@example.com --role=roles/viewer' },
            { d: 'Show the full policy', c: 'gcloud projects get-iam-policy PROJECT_ID --format=yaml' },
            { d: 'Who has a given role?', c: 'gcloud projects get-iam-policy PROJECT_ID --flatten="bindings[].members" \\\n  --filter="bindings.role=roles/owner" --format="value(bindings.members)"' },
            { d: 'Which roles does a principal have?', c: 'gcloud projects get-iam-policy PROJECT_ID --flatten="bindings[].members" \\\n  --filter="bindings.members:alice@example.com" --format="value(bindings.role)"' },
            { d: 'Temporary access with an IAM condition', c: 'gcloud projects add-iam-policy-binding PROJECT_ID --member=user:alice@example.com --role=roles/editor \\\n  --condition=\'expression=request.time < timestamp("2026-12-31T00:00:00Z"),title=temp-until-eoy\'' },
            { d: 'Edit-and-apply workflow (careful: replaces the policy)', c: 'gcloud projects get-iam-policy PROJECT_ID --format=json > policy.json\n# edit policy.json\ngcloud projects set-iam-policy PROJECT_ID policy.json' },
          ],
        },
        {
          title: 'Other levels & resources',
          cmds: [
            { d: 'Organization / folder', c: 'gcloud organizations add-iam-policy-binding ORG_ID --member=group:admins@example.com --role=roles/resourcemanager.folderViewer\ngcloud resource-manager folders add-iam-policy-binding FOLDER_ID --member=group:dev@example.com --role=roles/editor' },
            { d: 'A single bucket', c: 'gcloud storage buckets add-iam-policy-binding gs://BUCKET_NAME --member=group:analysts@example.com --role=roles/storage.objectViewer' },
            { d: 'A BigQuery dataset', c: 'bq add-iam-policy-binding --member=group:analysts@example.com --role=roles/bigquery.dataViewer PROJECT_ID:DATASET' },
            { d: 'A Secret Manager secret', c: 'gcloud secrets add-iam-policy-binding db-password --member=serviceAccount:SA_NAME@PROJECT_ID.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor' },
          ],
        },
      ],
    },
    {
      id: 'roles',
      title: 'Roles (predefined & custom)',
      icon: 'key',
      summary: 'Browse predefined roles and build custom ones.',
      description: 'Roles are collections of permissions. Basic roles (Owner/Editor/Viewer) are broad. Prefer predefined service roles, or define a custom role with exactly the permissions you need.',
      useCases: ['Finding the narrowest role for a task', 'Creating an org-wide custom role', 'Checking which permissions a role contains'],
      sections: [
        {
          title: 'Browse',
          cmds: [
            { d: 'List predefined roles matching a service', c: 'gcloud iam roles list --filter="name:roles/storage." --format="table(name, title)"' },
            { d: 'Show permissions in a role', c: 'gcloud iam roles describe roles/run.invoker' },
            { d: 'Which roles can be granted on a resource?', c: 'gcloud iam list-grantable-roles //cloudresourcemanager.googleapis.com/projects/PROJECT_ID' },
            { d: 'Permissions testable on a resource', c: 'gcloud iam list-testable-permissions //cloudresourcemanager.googleapis.com/projects/PROJECT_ID --filter="name:compute.instances"' },
          ],
        },
        {
          title: 'Custom roles',
          cmds: [
            { d: 'Create a project-level custom role', c: 'gcloud iam roles create vmOperator --project=PROJECT_ID --title="VM operator" \\\n  --permissions=compute.instances.start,compute.instances.stop,compute.instances.get,compute.instances.list --stage=GA' },
            { d: 'Create an org-level custom role from YAML', c: 'gcloud iam roles create vmOperator --organization=ORG_ID --file=role.yaml' },
            { d: 'Add permissions to a custom role', c: 'gcloud iam roles update vmOperator --project=PROJECT_ID --add-permissions=compute.instances.reset' },
            { d: 'Copy a predefined role as a starting point', c: 'gcloud iam roles copy --source=roles/viewer --destination=myViewer --dest-project=PROJECT_ID' },
            { d: 'List / delete / undelete custom roles', c: 'gcloud iam roles list --project=PROJECT_ID\ngcloud iam roles delete vmOperator --project=PROJECT_ID\ngcloud iam roles undelete vmOperator --project=PROJECT_ID' },
          ],
        },
      ],
    },
    {
      id: 'service-accounts',
      title: 'Service accounts',
      icon: 'robot',
      summary: 'Workload identities, keys and grants.',
      description: 'A service account is an identity for code. Attach it to a VM, Cloud Run service or function instead of shipping key files.',
      useCases: ['Giving a Cloud Run service access to a bucket', 'A dedicated identity per workload (least privilege)', 'Auditing and rotating keys'],
      sections: [
        {
          title: 'Manage',
          cmds: [
            { d: 'Create a service account', c: 'gcloud iam service-accounts create SA_NAME --display-name="Backend API"' },
            { d: 'List service accounts', c: 'gcloud iam service-accounts list' },
            { d: 'Grant it a project role', c: 'gcloud projects add-iam-policy-binding PROJECT_ID \\\n  --member=serviceAccount:SA_NAME@PROJECT_ID.iam.gserviceaccount.com --role=roles/storage.objectAdmin' },
            { d: 'Disable / enable / delete', c: 'gcloud iam service-accounts disable SA_NAME@PROJECT_ID.iam.gserviceaccount.com\ngcloud iam service-accounts enable SA_NAME@PROJECT_ID.iam.gserviceaccount.com\ngcloud iam service-accounts delete SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
            { d: 'Attach to a VM', c: 'gcloud compute instances set-service-account VM_NAME --zone=ZONE \\\n  --service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com --scopes=cloud-platform' },
          ],
        },
        {
          title: 'Keys (avoid if possible)',
          note: 'Long-lived keys are a leak risk. Prefer attached service accounts, impersonation or Workload Identity Federation.',
          cmds: [
            { d: 'Create a JSON key', c: 'gcloud iam service-accounts keys create key.json --iam-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
            { d: 'List keys', c: 'gcloud iam service-accounts keys list --iam-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com --managed-by=user' },
            { d: 'Delete a key', c: 'gcloud iam service-accounts keys delete KEY_ID --iam-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
          ],
        },
      ],
    },
    {
      id: 'impersonation',
      title: 'Impersonation',
      icon: 'mask',
      summary: 'Act as a service account with short-lived tokens.',
      description: 'With `roles/iam.serviceAccountTokenCreator` on a service account, you can mint short-lived tokens for it. No key file needed.',
      useCases: ['Testing what a workload can access', 'Admins running privileged commands as a break-glass SA', 'Signing URLs or JWTs without keys'],
      sections: [
        {
          title: 'Impersonate',
          cmds: [
            { d: 'Allow a user to impersonate a SA', c: 'gcloud iam service-accounts add-iam-policy-binding SA_NAME@PROJECT_ID.iam.gserviceaccount.com \\\n  --member=user:alice@example.com --role=roles/iam.serviceAccountTokenCreator' },
            { d: 'Impersonate for one command', c: 'gcloud compute instances list --impersonate-service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
            { d: 'Impersonate by default', c: 'gcloud config set auth/impersonate_service_account SA_NAME@PROJECT_ID.iam.gserviceaccount.com\ngcloud config unset auth/impersonate_service_account' },
            { d: 'ADC that impersonates (for local code)', c: 'gcloud auth application-default login --impersonate-service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
            { d: 'Print an impersonated access token', c: 'gcloud auth print-access-token --impersonate-service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
          ],
        },
      ],
    },
    {
      id: 'wif',
      title: 'Workload Identity Federation',
      icon: 'link',
      summary: 'Keyless auth from GitHub, AWS, Azure, OIDC.',
      description: 'Trust an external identity provider: its tokens are exchanged for short-lived Google credentials, so no service account keys are stored in CI.',
      useCases: ['GitHub Actions deploying to GCP without secrets', 'AWS / Azure workloads calling Google APIs', 'GKE pods using IAM (Workload Identity for GKE)'],
      sections: [
        {
          title: 'GitHub Actions example',
          cmds: [
            { d: 'Create a pool', c: 'gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"' },
            { d: 'Create an OIDC provider restricted to your org', c: 'gcloud iam workload-identity-pools providers create-oidc github-oidc --location=global --workload-identity-pool=github \\\n  --issuer-uri="https://token.actions.githubusercontent.com" \\\n  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \\\n  --attribute-condition="assertion.repository_owner==\'OWNER\'"' },
            { d: 'Let one repo impersonate a deployer SA', c: 'gcloud iam service-accounts add-iam-policy-binding SA_NAME@PROJECT_ID.iam.gserviceaccount.com --role=roles/iam.workloadIdentityUser \\\n  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/OWNER/REPO_NAME"' },
            { d: 'Get the provider resource name for the workflow', c: 'gcloud iam workload-identity-pools providers describe github-oidc --location=global --workload-identity-pool=github --format="value(name)"' },
          ],
        },
        {
          title: 'GKE Workload Identity',
          cmds: [
            { d: 'Enable on a cluster', c: 'gcloud container clusters update CLUSTER_NAME --region=REGION --workload-pool=PROJECT_ID.svc.id.goog' },
            { d: 'Grant a Kubernetes service account direct access', c: 'gcloud projects add-iam-policy-binding PROJECT_ID --role=roles/storage.objectViewer \\\n  --member="principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/PROJECT_ID.svc.id.goog/subject/ns/NAMESPACE/sa/KSA_NAME"' },
          ],
        },
      ],
    },
    {
      id: 'org-policy',
      title: 'Organization policies',
      icon: 'policy',
      summary: 'Guardrails: restrict locations, keys, public IPs…',
      description: 'Constraints that apply to every resource under an org, folder or project, whatever IAM says. Examples: allowed regions, no SA keys, no public buckets.',
      useCases: ['Keeping data in the EU', 'Blocking service account key creation', 'Preventing public IPs on VMs'],
      sections: [
        {
          title: 'Policies',
          cmds: [
            { d: 'List available constraints', c: 'gcloud org-policies list-available-constraints --organization=ORG_ID' },
            { d: 'Show policies set on a project', c: 'gcloud org-policies list --project=PROJECT_ID' },
            { d: 'Describe the effective policy', c: 'gcloud org-policies describe constraints/gcp.resourceLocations --project=PROJECT_ID --effective' },
            { d: 'Enforce a boolean constraint', c: 'gcloud resource-manager org-policies enable-enforce iam.disableServiceAccountKeyCreation --organization=ORG_ID' },
            { d: 'Apply a policy from YAML', c: 'gcloud org-policies set-policy policy.yaml' },
            { d: 'Reset to inherited', c: 'gcloud org-policies reset constraints/compute.vmExternalIpAccess --project=PROJECT_ID' },
          ],
        },
      ],
    },
    {
      id: 'troubleshoot',
      title: 'Audit & troubleshooting',
      icon: 'search',
      summary: 'Why can (or can\'t) someone access something?',
      description: 'Tools to explain access: Policy Troubleshooter, Asset Inventory searches and audit logs.',
      useCases: ['Debugging a "permission denied" error', 'Finding every place a user has access', 'Reviewing who changed IAM recently'],
      sections: [
        {
          title: 'Explain & search',
          cmds: [
            { d: 'Troubleshoot one permission for one principal', c: 'gcloud policy-intelligence troubleshoot-policy iam //cloudresourcemanager.googleapis.com/projects/PROJECT_ID \\\n  --principal-email=alice@example.com --permission=storage.buckets.list' },
            { d: 'Search all IAM bindings for a user across the org', c: 'gcloud asset search-all-iam-policies --scope=organizations/ORG_ID --query="policy:alice@example.com"' },
            { d: 'Find who has Owner anywhere in a project', c: 'gcloud asset search-all-iam-policies --scope=projects/PROJECT_ID --query="policy:roles/owner"' },
            { d: 'Role recommendations (remove excess permissions)', c: 'gcloud recommender recommendations list --project=PROJECT_ID --location=global --recommender=google.iam.policy.Recommender' },
          ],
        },
        {
          title: 'Audit logs',
          cmds: [
            { d: 'Recent IAM policy changes', c: 'gcloud logging read \'protoPayload.methodName="SetIamPolicy"\' --project=PROJECT_ID --freshness=7d --limit=20' },
            { d: 'Permission-denied errors', c: 'gcloud logging read \'protoPayload.status.code=7\' --project=PROJECT_ID --freshness=1d --limit=20' },
          ],
        },
      ],
    },
  ],
};
