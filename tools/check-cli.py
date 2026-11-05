#!/usr/bin/env python3
"""Checks calls extracted by extract-cli.mjs against the installed CLI.

gcloud: finds the longest leading run of words that is a real command (via
`gcloud … --help`) and checks every --flag appears in that command's help.
bq: uses the CLI tree from `gcloud meta cli-trees update --commands=bq`.

Run inside gcr.io/google.com/cloudsdktool/google-cloud-cli:stable:
    python3 check-cli.py calls.json bq.json
"""
import json
import re
import subprocess
import sys
from functools import lru_cache

WORD = re.compile(r"^[a-z][a-z0-9-]*$")
FLAG = re.compile(r"--(?:\[no-\])?([a-z][a-z0-9-]*)")


@lru_cache(maxsize=None)
def gcloud_help(path: tuple[str, ...]) -> str | None:
    p = subprocess.run(["gcloud", *path, "--help"], capture_output=True, text=True,
                       env={"PATH": "/usr/bin:/bin:/usr/lib/google-cloud-sdk/bin", "PAGER": "cat",
                            "CLOUDSDK_CORE_DISABLE_PROMPTS": "1", "HOME": "/tmp"})
    return p.stdout if p.returncode == 0 else None


def help_flags(text: str) -> set[str]:
    names = set(FLAG.findall(text))
    # "--[no-]foo" documents both --foo and --no-foo
    names |= {"no-" + n for n in re.findall(r"--\[no-\]([a-z0-9-]+)", text)}
    return names


def synopsis_is_group(path, text):
    prefix = re.escape(" ".join(["gcloud", *path]))
    return re.search(prefix + r"\s+(GROUP \| COMMAND|GROUP|COMMAND)\b", text) is not None


def check_gcloud(args):
    path, text = [], gcloud_help(())
    for a in args:
        if not WORD.match(a) or not synopsis_is_group(path, text):
            break  # a flag, a positional value, or we already reached a command
        sub = gcloud_help(tuple(path + [a]))
        if sub is None:
            return f"'gcloud {' '.join(path)}' has no subcommand '{a}'"
        path, text = path + [a], sub
    if synopsis_is_group(path, text):
        return f"'gcloud {' '.join(path)}' is a group, not a command"
    known = help_flags(text)
    flags = args[:args.index("--")] if "--" in args else args  # after "--" args go to the job
    bad = [a.split("=")[0] for a in flags if a.startswith("--") and a.split("=")[0][2:] not in known]
    return f"gcloud {' '.join(path)}: unknown flags {bad}" if bad else None


@lru_cache(maxsize=None)
def bq_help(cmd: str) -> set[str]:
    p = subprocess.run(["bq", "help", cmd], capture_output=True, text=True, env={"PATH": "/usr/bin:/bin:/usr/lib/google-cloud-sdk/bin", "HOME": "/tmp"})
    return set(re.findall(r"--(?:\[no\])?([a-z][a-z0-9_]*)", p.stdout))


def check_bq(args, cmds, glob):
    cmd = next((a for a in args if not a.startswith("-")), None)
    if cmd not in cmds:
        return f"unknown bq command: {cmd}"
    known = bq_help(cmd) | glob
    bad = []
    for a in args:
        if a.startswith("-") and a not in ("-", "--") and not re.match(r"^-[a-z]$", a):
            name = a.lstrip("-").split("=")[0]
            if name not in known and not (name.startswith("no") and name[2:] in known):
                bad.append(a.split("=")[0])
    return f"bq {cmd}: unknown flags {bad}" if bad else None


def bq_index(tree):
    return tree.get("commands", {}), {f.lstrip("-") for f in tree.get("flags", {})}


def main():
    calls = json.load(open(sys.argv[1]))
    cmds, glob = bq_index(json.load(open(sys.argv[2])))
    problems, seen = [], set()
    for c in calls:
        key = (c["tool"], tuple(c["args"]))
        if key in seen:
            continue
        seen.add(key)
        err = check_gcloud(c["args"]) if c["tool"] == "gcloud" else check_bq(c["args"], cmds, glob)
        if err:
            problems.append(f"{c['where']}\n    {err}\n    $ {c['tool']} {' '.join(c['args'])[:160]}")
    print(f"checked {len(seen)} unique invocations, {len(problems)} problems")
    print("\n".join(problems))


if __name__ == "__main__":
    main()
