Title: Introducing Storage Buckets on the Hugging Face Hub

URL Source: https://huggingface.co/blog/storage-buckets

Published Time: 2026-03-10T00:00:00.680Z

Markdown Content:
[Back to Articles](https://huggingface.co/blog)

[![Image 1: Lucain Pouget's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/1659336880158-6273f303f6d63a28483fde12.png)](https://huggingface.co/Wauplin)

[![Image 2: Eliott Coyac's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/61d2f90c3c2083e1c08af22d/jn21aKijwBnopk7aUJUkq.png)](https://huggingface.co/coyotte508)

[![Image 3: Adrien Carreira's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/61a5dcedf14aa6d7c74925f7/ZbVN8MsvjWwanqOwUdIeC.png)](https://huggingface.co/XciD)

[![Image 4: Victor Mustar's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/5f17f0a0925b9863e28ad517/fXIY5i9RLsIa1v3CCuVtt.jpeg)](https://huggingface.co/victor)

[![Image 5: Julien Chaumond's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/5dd96eb166059660ed1ee413/NQtzmrDdbG0H8qkZvRyGk.jpeg)](https://huggingface.co/julien-c)

[![Image 6: Quentin Lhoest's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/1594214747713-5e9ecfc04957053f60648a3e.png)](https://huggingface.co/lhoestq)

[![Image 7: Pierric Cistac's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/1624630689857-5e67de201009063689407481.jpeg)](https://huggingface.co/pierric)

[![Image 8: Sylvestre Bcht's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/6258561f4d4291e8e63d8ae6/EYjinEYAcbtm_dL5QmmRi.png)](https://huggingface.co/Sylvestre)

[![Image 9: Hugo Larcher's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/641cc77c92cd25302998b740/5A81W5s3ecLaLXFir52Rw.jpeg)](https://huggingface.co/hlarcher)

[![Image 10: Rajat Arya's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/667c7853ed85453a28a05f19/H2gcBeOAorIsQj3vNinYB.jpeg)](https://huggingface.co/rajatarya)

[![Image 11: Di Xiao's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/64c3b82bfafa16b514253fd8/bivgVJJMERqvS4CfdhDmO.jpeg)](https://huggingface.co/seanses)

[![Image 12: Assaf Vayner's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/66abc1489654032803752328/TgdSHoXKcyy0uKzld7oyw.jpeg)](https://huggingface.co/assafvayner)

*   [Why we built Buckets](https://huggingface.co/blog/storage-buckets#why-we-built-buckets "Why we built Buckets")

*   [Why Xet matters](https://huggingface.co/blog/storage-buckets#why-xet-matters "Why Xet matters")

*   [Pre-warming: bringing data close to compute](https://huggingface.co/blog/storage-buckets#pre-warming-bringing-data-close-to-compute "Pre-warming: bringing data close to compute")

*   [Getting started](https://huggingface.co/blog/storage-buckets#getting-started "Getting started")

*   [Using Buckets from Python](https://huggingface.co/blog/storage-buckets#using-buckets-from-python "Using Buckets from Python")

*   [Filesystem integration](https://huggingface.co/blog/storage-buckets#filesystem-integration "Filesystem integration")

*   [From Buckets to versioned repos](https://huggingface.co/blog/storage-buckets#from-buckets-to-versioned-repos "From Buckets to versioned repos")

*   [Trusted by launch partners](https://huggingface.co/blog/storage-buckets#trusted-by-launch-partners "Trusted by launch partners")

*   [Conclusion and resources](https://huggingface.co/blog/storage-buckets#conclusion-and-resources "Conclusion and resources")

Hugging Face Models and Datasets repos are great for publishing final artifacts. But production ML generates a constant stream of intermediate files (checkpoints, optimizer states, processed shards, logs, traces, etc.) that change often, arrive from many jobs at once, and rarely need version control.

**Storage Buckets** are built exactly for this: mutable, S3-like object storage you can browse on the Hub, script from Python, or manage with the `hf` CLI. And because they are backed by [Xet](https://huggingface.co/docs/hub/en/xet), they are especially efficient for ML artifacts that share content across files.

![Image 13](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/buckets/buckets-annoucement.png)

## [](https://huggingface.co/blog/storage-buckets#why-we-built-buckets) Why we built Buckets

Git starts to feel like the wrong abstraction pretty quickly when you're dealing with:

*   Training clusters writing checkpoints and optimizer states throughout a run
*   Data pipelines processing raw datasets iteratively
*   Agents storing traces, memory, and shared knowledge graphs

The storage need in all these cases is the same: write fast, overwrite when needed, sync directories, remove stale files, and keep things moving.

A Bucket is a non-versioned storage container on the Hub. It lives under a user or organization namespace, has standard Hugging Face permissions, can be private or public, has a page you can open in your browser, and can be addressed programmatically with a handle like `hf://buckets/username/my-training-bucket`.

## [](https://huggingface.co/blog/storage-buckets#why-xet-matters) Why Xet matters

Buckets are built on [Xet](https://huggingface.co/docs/hub/en/xet), Hugging Face’s chunk-based storage backend, and this matters more than it might seem.

Instead of treating files as monolithic blobs, Xet breaks content into chunks and deduplicates across them. Upload a processed dataset that’s mostly similar to the raw one? Many chunks already exist. Store successive checkpoints where large parts of the model are frozen? Same story. Buckets skip the bytes that are already there, which means less bandwidth, faster transfers, and more efficient storage.

This is a natural fit for ML workloads. Training pipelines constantly produce families of related artifacts — raw and processed data, successive checkpoints, Agent traces and derived summaries — and Xet is designed to take advantage of that overlap.

For Enterprise customers, billing is based on deduplicated storage, so shared chunks directly reduce the billed footprint. Deduplication helps with both speed and cost.

![Image 14](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/buckets/buckets-xet-dedup.png)

## [](https://huggingface.co/blog/storage-buckets#pre-warming-bringing-data-close-to-compute) Pre-warming: bringing data close to compute

Buckets live on the Hub, which means global storage by default. But not every workload can afford to pull data from wherever it happens to live, for distributed training and large-scale pipelines, storage location directly affects throughput.

Pre-warming lets you bring hot data closer to the cloud provider and region where your compute runs. Instead of data traveling across regions on every read, you declare where you need it and Buckets make sure it's already there when your jobs start. This is especially useful for training clusters that need fast access to large datasets or checkpoints, and for multi-region setups where different parts of a pipeline run in different clouds.

We are partnering with AWS and GCP to start with, more more cloud providers coming in the future.

![Image 15](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/buckets/buckets-cdn-prewarm.png)

## [](https://huggingface.co/blog/storage-buckets#getting-started) Getting started

You can get a bucket up and running in under 2 minutes with the `hf` CLI. First thing is to install it and log in:

```
curl -LsSf https://hf.co/cli/install.sh | bash
hf auth login
```

Create a bucket for your project:

```
hf buckets create my-training-bucket --private
```

Say your training job is writing checkpoints locally to `./checkpoints`. Sync that directory into the Bucket:

```
hf buckets sync ./checkpoints hf://buckets/username/my-training-bucket/checkpoints
```

For large transfers, you might want to see what will happen before anything moves. `--dry-run` prints the plan without executing anything:

```
hf buckets sync ./checkpoints hf://buckets/username/my-training-bucket/checkpoints --dry-run
```

You can also save the plan to a file for review and apply it later:

```
hf buckets sync ./checkpoints hf://buckets/username/my-training-bucket/checkpoints --plan sync-plan.jsonl
hf buckets sync --apply sync-plan.jsonl
```

Once done, inspect the Bucket from the CLI:

```
hf buckets list username/my-training-bucket -h
```

or browse it directly on the Hub at `https://huggingface.co/buckets/username/my-training-bucket`.

That is the whole loop. Create a bucket, sync your working data into it, check on it when you need to, and save the versioned repo for when something is worth publishing. For one-off operations, `hf buckets cp` copies individual files and `hf buckets remove` cleans up stale objects.

## [](https://huggingface.co/blog/storage-buckets#using-buckets-from-python) Using Buckets from Python

Everything above also works from Python via [`huggingface_hub`](https://github.com/huggingface/huggingface_hub) (available since [v1.5.0](https://github.com/huggingface/huggingface_hub/releases/tag/v1.5.0)). The API follows the same pattern: create, sync, inspect.

```
from huggingface_hub import create_bucket, list_bucket_tree, sync_bucket

create_bucket("my-training-bucket", private=True, exist_ok=True)

sync_bucket(
    "./checkpoints",
    "hf://buckets/username/my-training-bucket/checkpoints",
)

for item in list_bucket_tree(
    "username/my-training-bucket",
    prefix="checkpoints",
    recursive=True,
):
    print(item.path, item.size)
```

This makes it straightforward to integrate Buckets into training scripts, data pipelines, or any service that manages artifacts programmatically. The Python client also supports batch uploads, selective downloads, deletes, and bucket moves for when you need finer control.

Bucket support is also available in JavaScript via [`@huggingface/hub`](https://www.npmjs.com/package/@huggingface/hub) (since v2.10.5), so you can integrate Buckets into Node.js services and web applications as well.

## [](https://huggingface.co/blog/storage-buckets#filesystem-integration) Filesystem integration

Buckets also work through `HfFileSystem`, the [fsspec](https://filesystem-spec.readthedocs.io/)-compatible filesystem in `huggingface_hub`. This means you can list, read, write, and glob Bucket contents using standard filesystem operations — and any library that supports fsspec can access Buckets directly.

```
from huggingface_hub import hffs

# List files in a bucket directory
hffs.ls("buckets/username/my-training-bucket/checkpoints", detail=False)

# Glob for specific files
hffs.glob("buckets/username/my-training-bucket/**/*.parquet")

# Read a file directly
with hffs.open("buckets/username/my-training-bucket/config.yaml", "r") as f:
    print(f.read())
```

Because fsspec is the standard Python interface for remote filesystems, libraries like pandas, Polars, and Dask can read from and write to Buckets using `hf://` paths with no extra setup:

```
import pandas as pd

# Read a CSV directly from a Bucket
df = pd.read_csv("hf://buckets/username/my-training-bucket/results.csv")

# Write results back
df.to_csv("hf://buckets/username/my-training-bucket/summary.csv")
```

This makes it easy to plug Buckets into existing data workflows without changing how your code reads or writes files.

## [](https://huggingface.co/blog/storage-buckets#from-buckets-to-versioned-repos) From Buckets to versioned repos

Buckets are the fast, mutable place where artifacts live while they are still in motion. Once something becomes a stable deliverable, it usually belongs to a versioned model or dataset repo.

On the roadmap, we plan to support direct transfers between Buckets and repos in both directions: promote final checkpoint weights into a model repo, or commit processed shards into a dataset repo once a pipeline completes. The working layer and the publishing layer stay separate, but fit into one continuous Hub-native workflow.

## [](https://huggingface.co/blog/storage-buckets#trusted-by-launch-partners) Trusted by launch partners

Before opening Buckets to everyone, we ran a private beta with a small group of launch partners.

![Image 16](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/buckets/buckets-launch-partners.png)

A huge thank you to Jasper, Arcee, IBM, and PixAI for testing early versions, surfacing bugs, and sharing feedback that directly shaped this feature.

## [](https://huggingface.co/blog/storage-buckets#conclusion-and-resources) Conclusion and resources

Storage Buckets bring a missing storage layer to the Hub. They give you a Hub-native place for the mutable, high-throughput side of ML: checkpoints, processed data, Agent traces, logs, and everything else that is useful before it becomes final.

Because they are built on Xet, Buckets are not just easier to use than forcing everything through Git. They are also more efficient for the kinds of related artifacts AI systems produce all the time. That means faster transfers, better deduplication, and on Enterprise plans, billing that benefits from the deduplicated footprint.

If you already use the Hub, Buckets let you keep more of your workflow in one place. If you come from S3-style storage, they give you a familiar model with better alignment to AI artifacts and a clear path toward final publication on the Hub.

Buckets are included in existing [Hub storage plans](https://huggingface.co/docs/hub/en/storage-limits#storage-plans). Free accounts come with storage to get started, and PRO and Enterprise plans offer higher limits. See the [storage page](https://huggingface.co/storage) for details.

Read more and try it yourself:

*   [Buckets guide](https://huggingface.co/docs/huggingface_hub/en/guides/buckets)
*   [Hub documentation](https://huggingface.co/docs/hub/storage-buckets)
*   CLI [Installation guide](https://huggingface.co/docs/huggingface_hub/en/installation)
*   CLI [guide](https://huggingface.co/docs/huggingface_hub/en/guides/cli) and [reference](https://huggingface.co/docs/huggingface_hub/en/package_reference/cli)
*   [Example Bucket on the Hub](https://huggingface.co/buckets/julien-c/my-training-bucket)
*   [Storage pricing](https://huggingface.co/pricing#storage)
