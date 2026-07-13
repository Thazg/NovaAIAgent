Title: Weaviate 1.38 Release

URL Source: https://weaviate.io/blog/weaviate-1-38-release

Published Time: 2026-06-25T00:00:00.000Z

Markdown Content:
Weaviate `v1.38` is now available open-source and on [Weaviate Cloud](https://console.weaviate.cloud/).

Two capabilities reach general availability in this release: the **HFresh** disk-based vector index and the built-in **MCP Server**. **Async replication** has been rebuilt to run cluster-wide from a single scheduler, and it now runs by default on every replicated collection. Two new previews join them: the **Boost API** for query-time rescoring and **Nested Object Filtering**.

Here are the release highlights!

![Image 1: Weaviate 1.38 is released](https://weaviate.io/assets/images/hero-4a89efeaabb0804a755c5d50b90bcc88.png)

*   [HFresh Vector Index - General Availability](https://weaviate.io/blog/weaviate-1-38-release#hfresh-vector-index---general-availability)
*   [MCP Server - General Availability](https://weaviate.io/blog/weaviate-1-38-release#mcp-server---general-availability)
*   [Async Replication, Everywhere](https://weaviate.io/blog/weaviate-1-38-release#async-replication-everywhere)
*   [Boost API (Preview)](https://weaviate.io/blog/weaviate-1-38-release#boost-api-preview)
*   [Nested Object Filtering (Preview)](https://weaviate.io/blog/weaviate-1-38-release#nested-object-filtering-preview)
*   [Performance Improvements and Fixes](https://weaviate.io/blog/weaviate-1-38-release#performance-improvements-and-fixes)
*   [Community Contributions](https://weaviate.io/blog/weaviate-1-38-release#community-contributions)
*   [Summary](https://weaviate.io/blog/weaviate-1-38-release#summary)

## HFresh Vector Index - General Availability[​](https://weaviate.io/blog/weaviate-1-38-release#hfresh-vector-index---general-availability "Direct link to HFresh Vector Index - General Availability")

[HFresh](https://weaviate.io/blog/weaviate-1-36-release#hfresh-preview), the disk-based vector index we introduced as a technical preview in `v1.36`, is now **generally available**. It's inspired by the [SPFresh algorithm](https://arxiv.org/abs/2410.14452): instead of keeping every vector in memory like HNSW, HFresh groups vectors into on-disk regions called _postings_ and keeps a small in-memory HNSW index over their centroids to decide which regions to read. Memory stays low and latency stays predictable as a collection grows into the billions, which makes it a good fit for **streaming workloads** where data changes continuously rather than being loaded once.

### How it works[​](https://weaviate.io/blog/weaviate-1-38-release#how-it-works "Direct link to How it works")

HFresh is selected per (named) vector, the same way as any other index. In `v1.38` it's no longer behind a preview flag — you enable it by configuring a vector to use it:

`from weaviate.classes.config import Configure, VectorDistancesclient.collections.create(    "Article",    vector_config=Configure.Vectors.text2vec_weaviate(        name="default",        source_properties=["title", "body"],        vector_index_config=Configure.VectorIndex.hfresh(            distance_metric=VectorDistances.COSINE,        ),    ),)`

HFresh has **RQ-1**[quantization](https://docs.weaviate.io/weaviate/concepts/vector-quantization) built in: postings are stored compressed on disk, and final ranking rescores against the uncompressed vectors for accuracy. It supports the `cosine` and `l2-squared` distance metrics.

Because the index rebalances incrementally — splitting oversized postings, merging undersized ones, and reassigning vectors as the boundaries shift — it keeps up with continuous updates without the periodic full rebuilds that other on-disk indexes depend on.

Related resources

## MCP Server - General Availability[​](https://weaviate.io/blog/weaviate-1-38-release#mcp-server---general-availability "Direct link to MCP Server - General Availability")

The built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server, introduced as a preview in [`v1.37`](https://weaviate.io/blog/weaviate-1-37-release#mcp-server-preview), is now **generally available**. It lets LLMs, IDEs, and AI agents work with Weaviate directly — inspecting schemas, running hybrid searches, and writing objects back — with no glue code. The server is a Streamable HTTP endpoint at `/v1/mcp` on the same port as the REST API, authenticates with a Bearer / API-key token, and respects Weaviate's standard [RBAC](https://docs.weaviate.io/deploy/configuration/authorization) permissions.

The server exposes four tools:

*   **`weaviate-collections-get-config`** — inspect a collection's schema and configuration
*   **`weaviate-tenants-list`** — list the tenants of a multi-tenant collection
*   **`weaviate-query-hybrid`** — run a hybrid (vector + keyword) search
*   **`weaviate-objects-upsert`** — insert or update objects (only when write access is enabled)

### How it works[​](https://weaviate.io/blog/weaviate-1-38-release#how-it-works-1 "Direct link to How it works")

You enable the server with `MCP_SERVER_ENABLED`, and optionally expose its write tools with `MCP_SERVER_WRITE_ACCESS_ENABLED`. What's new in `v1.38` is that both flags are **runtime-configurable**: rather than only being read at startup, Weaviate now picks up changes to them from its runtime-overrides file while the cluster is running.

`# Runtime-overrides file — applied without a restartmcp_server_enabled: truemcp_server_write_access_enabled: true`

So you can grant or revoke an agent's write access on a live cluster, with no rolling restart.

Related resources

## Async Replication, Everywhere[​](https://weaviate.io/blog/weaviate-1-38-release#async-replication-everywhere "Direct link to Async Replication, Everywhere")

Async replication is the background repair process that keeps replicas in sync on collections with a replication factor greater than 1. In `v1.38` it has been re-architected to run **cluster-wide from a single scheduler**, rather than being configured and run separately per collection. It also now runs **by default** on every RF > 1 collection, where previously it was opt-in per collection.

### How it works[​](https://weaviate.io/blog/weaviate-1-38-release#how-it-works-2 "Direct link to How it works")

One scheduler coordinates async repair across all replicated collections, drawing from a single shared worker pool instead of a separate pool per collection. That makes repair behavior consistent across the cluster and simpler to operate at scale.

With the move to a central scheduler, the per-collection `maxWorkers` and `enabled` settings are gone. Two cluster-level controls replace them:

`# Size of the shared async-replication worker poolASYNC_REPLICATION_SCHEDULER_WORKERS: '<n>'# Kill-switch — pause all async replication, no restart neededASYNC_REPLICATION_DISABLED: 'false'`

`ASYNC_REPLICATION_SCHEDULER_WORKERS` sizes the shared pool, and `ASYNC_REPLICATION_DISABLED` is a cluster-wide kill-switch you can flip at runtime.

Related resources

## Boost API (Preview)[​](https://weaviate.io/blog/weaviate-1-38-release#boost-api-preview "Direct link to Boost API (Preview)")

Sometimes you want to nudge results without removing any. A filter is too blunt for that — it drops everything that doesn't match — when what you really want is to rank fresh articles a little higher, or favor in-stock products, while keeping the full result set. The new **Boost API** does exactly that.

### How it works[​](https://weaviate.io/blog/weaviate-1-38-release#how-it-works-3 "Direct link to How it works")

Boost runs _after_ the primary search. It re-scores the candidates by blending their original score with one or more boost conditions, then re-sorts them — promoting or demoting results without dropping any. Conditions can be based on:

*   **Filter matches** — promote results that satisfy a filter
*   **Property values** — rank by a numeric property's value
*   **Time decay** — favor more recent (or near-a-date) objects
*   **Numeric decay** — favor objects closer to a target number

In the Python client (`v4.22.0`+), you build a boost and pass it to any query via `boost=`:

`from weaviate.classes.query import Boost, Filter# Softly promote in-stock products without dropping the restresponse = collection.query.hybrid(    query="wireless headphones",    limit=10,    boost=Boost.filter(        Filter.by_property("in_stock").equal(True),        weight=0.3,    ),)`

The `weight` (0–1) sets how much the boost shifts the final score: the result is `(1 - weight)` of the original score plus `weight` of the boost score. Boost is **gRPC-only** — there's no REST or GraphQL equivalent — and a single query can apply at most **20 conditions**.

Preview

The Boost API is a **preview** feature, available over gRPC. The API and behavior may change in future releases.

Related resources

## Nested Object Filtering (Preview)[​](https://weaviate.io/blog/weaviate-1-38-release#nested-object-filtering-preview "Direct link to Nested Object Filtering (Preview)")

Weaviate `v1.38` adds a preview for **filtering on nested object properties**. Until now, `object` and `object[]` properties were stored but couldn't be filtered on directly.

### How it works[​](https://weaviate.io/blog/weaviate-1-38-release#how-it-works-4 "Direct link to How it works")

You filter on a nested field by referencing it with a **dotted path** — for example, `cars.make` to filter on the `make` field inside a `cars` object property. The feature is **off by default** and gated behind a preview environment variable:

`WEAVIATE_PREVIEW_NESTED_FILTERING: 'true'`

Once enabled, the dotted path goes wherever you'd normally supply a property name, including from the clients:

`from weaviate.classes.query import Filterresponse = collection.query.fetch_objects(    filters=Filter.by_property("cars.make").equal("Toyota"),)`

This works for data nested inside both `object` and `object[]` properties.

Preview

Nested Object Filtering is a **preview** feature, off by default behind `WEAVIATE_PREVIEW_NESTED_FILTERING`. The API and behavior may change in future releases.

Related resources

## Performance Improvements and Fixes[​](https://weaviate.io/blog/weaviate-1-38-release#performance-improvements-and-fixes "Direct link to Performance Improvements and Fixes")

Beyond the headline features, `v1.38` ships a long list of improvements. A few worth calling out:

*   **Production-ready replica movement:** Moving a shard's replicas between nodes — for rebalancing and scaling — graduates to production-ready, backed by a change-capture log that keeps writes flowing during the move.
*   **Default vector index type:** A new cluster-level setting picks the default vector index for new collections (including named vectors), instead of always defaulting to HNSW.
*   **Usage guardrails:** Operators can set server-side limits on the number of objects, collections, tenants, and shards, plus allow-lists for vector-index and compression types.
*   **New module — `text2vec-digitalocean`:** Generate embeddings through DigitalOcean's inference platform.
*   **Backup reliability:** Backups no longer pause compactions, and object-storage listing is faster — both help large collections back up more reliably.
*   **Fractional BM25 property boosts:** Keyword-search property boosts now accept fractional values (e.g. `title^2.5`), not just integers.
*   **Deterministic tie-breaking:** Vector searches break ties between equal-distance results deterministically, for stable, repeatable ordering.
*   **Faster startup** and an improved cache for compressed vector indexes.

Related resources

Weaviate is open source, and this release includes work from several first-time contributors. Thank you to:

*   [@dillonledoux](https://github.com/dillonledoux) — the new `text2vec-digitalocean` module ([#11298](https://github.com/weaviate/weaviate/pull/11298))
*   [@anishesg](https://github.com/anishesg) — inverted-index and HFresh fixes, including correct handling of negative zero and pre-1970 dates ([#11120](https://github.com/weaviate/weaviate/pull/11120))
*   [@msnandhis](https://github.com/msnandhis) — fractional BM25 property boosts ([#11471](https://github.com/weaviate/weaviate/pull/11471))
*   [@3em0](https://github.com/3em0) — reject duplicate static API keys ([#11393](https://github.com/weaviate/weaviate/pull/11393))
*   [@kedar49](https://github.com/kedar49) — collision check for DB user identifiers ([#11381](https://github.com/weaviate/weaviate/pull/11381))
*   [@SAY-5](https://github.com/SAY-5) — HFresh stability fix during async init ([#11087](https://github.com/weaviate/weaviate/pull/11087))

If you'd like to contribute, check out the [contributor guide](https://docs.weaviate.io/contributor-guide/) and the [`good-first-issue`](https://github.com/weaviate/weaviate/issues) label on GitHub.

## Summary[​](https://weaviate.io/blog/weaviate-1-38-release#summary "Direct link to Summary")

Weaviate `v1.38` brings two capabilities to general availability — HFresh and the MCP Server — alongside a rebuilt async replication path and two new previews.

**Key highlights:**

*   **HFresh (GA)** — The disk-based, SPFresh-inspired vector index for streaming workloads, selected per named vector with `vectorIndexType: "hfresh"` and built-in RQ-1 quantization
*   **MCP Server (GA)** — The built-in Model Context Protocol server at `/v1/mcp`, with its enable flags now runtime-configurable
*   **Async Replication, Everywhere** — Cluster-wide async repair from one scheduler and a shared worker pool, on by default for replicated collections, with a runtime kill-switch
*   **Boost API (Preview)** — Query-time rescoring that promotes or demotes results without dropping any
*   **Nested Object Filtering (Preview)** — Filter on `object` / `object[]` properties using a dotted path

**Ready to get started?**

The release is available open-source on [GitHub](https://github.com/weaviate/weaviate/releases/tag/v1.38.0) and on [Weaviate Cloud](https://console.weaviate.cloud/), where you can spin up a cluster on the free tier.

note

Not all features may be available on Weaviate Cloud. Some capabilities — preview features in particular, and those that require specific environment configuration — may not be enabled on managed clusters, or may become available on a different schedule.

For those upgrading a self-hosted version, please check the [migration guide](https://docs.weaviate.io/deploy/migration#general-upgrade-instructions) for version-specific notes.

Thanks for reading, and happy vector searching!

## Ready to start building?[​](https://weaviate.io/blog/weaviate-1-38-release#ready-to-start-building "Direct link to Ready to start building?")

Check out the [Quickstart tutorial](https://docs.weaviate.io/weaviate/quickstart), or build amazing apps with a free trial of [Weaviate Cloud (WCD)](https://console.weaviate.cloud/).
