Title: Build a Coding Assistant with Weaviate MCP: RAG over Code & Docs

URL Source: https://weaviate.io/blog/coding-assistant-weaviate-mcp

Published Time: 2026-05-21T00:00:00.000Z

Markdown Content:
![Image 1: Coding assistant with Weaviate MCP server: hybrid search RAG over your codebase and documentation](https://weaviate.io/assets/images/hero-a54bc5be1b7e33c82e4f7a9ce0aaefc7.png)

Last week I asked [Claude Code](https://docs.claude.com/en/docs/claude-code/) to implement something relatively trivial in my codebase. Three turns in, the conversation used up >80K tokens and Claude was still missing some crucial information I'd forgotten to include. That's the loop you fall into without retrieval: paste too little and the agent guesses, paste too much and pay for context the agent isn't using.

Most teams solve this with [RAG](https://weaviate.io/blog/introduction-to-rag) over the codebase. The typical setup is a vector database plus a custom MCP server process bridging the two. Weaviate simplifies this: the [MCP server is built into the database](https://docs.weaviate.io/weaviate/mcp/mcp-server), at `/v1/mcp` on the same port as the REST API. One env var enables it. The same [hybrid search](https://docs.weaviate.io/weaviate/concepts/search/hybrid-search) you'd use for any other Weaviate workload powers code retrieval, with the [BM25](https://docs.weaviate.io/weaviate/search/bm25) half keeping function identifiers like `connect_to_local` matchable and the vector half finding semantic intent like "how do I init a client."

This post walks through building a coding assistant on top of that built-in MCP server: ingest a codebase, ingest its docs, connect Claude Code, Cursor, and VS Code, and run real queries. Topics covered:

*   [Why your coding assistant needs more than its training data](https://weaviate.io/blog/coding-assistant-weaviate-mcp#why-your-coding-assistant-needs-more)
*   [Why Weaviate MCP fits this job](https://weaviate.io/blog/coding-assistant-weaviate-mcp#why-weaviate-mcp-fits)
*   [Step 1: Run Weaviate with MCP enabled](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-1-run-weaviate)
*   [Step 2: Design the schema](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-2-design-the-schema)
*   [Step 3: Chunk and ingest the codebase](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-3-ingest-codebase)
*   [Step 4: Chunk and ingest documentation](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-4-ingest-docs)
*   [Step 5: Connect Claude Code, Cursor, and VS Code](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-5-connect-clients)
*   [Try it out](https://weaviate.io/blog/coding-assistant-weaviate-mcp#try-it-out)
*   [Agent runbook: autonomous setup](https://weaviate.io/blog/coding-assistant-weaviate-mcp#agent-runbook)

## Why your coding assistant needs more than its training data[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#why-your-coding-assistant-needs-more "Direct link to Why your coding assistant needs more than its training data")

LLMs ship with a fixed cutoff and zero knowledge of your private code. The naive workaround is to dump files into the prompt. That has three problems.

*   **Cost**: Tokens in context are billed. Every turn. A 200-file Python project doesn't fit, and even the parts that do are billed continuously while the agent reasons.

*   **Stale context**: Once a file is in the prompt, it's frozen. If the agent changes a function and then needs to read it again, it has to reload the whole file. There's no live link between the model's view and the on-disk truth.

*   **Wrong granularity**: Even when files fit, the model spends attention on the wrong parts. Imports. Module-level boilerplate. The function the agent is actually editing competes for context with a hundred lines of `from x import y`.

Retrieval solves all three. Index the codebase once, store the chunks in a vector database, and let the LLM client pull only what it needs per query. That's RAG. Coding assistants haven't had a clean way to talk to such a database without a custom shim. That's where MCP comes in.

## Why Weaviate MCP fits this job[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#why-weaviate-mcp-fits "Direct link to Why Weaviate MCP fits this job")

[The Model Context Protocol](https://modelcontextprotocol.io/docs/develop/build-server) (MCP) is the standardized way for LLM clients like Claude Code, Cursor, and VS Code to call out to external tools. Weaviate `v1.37.1` exposes its core operations as MCP tools directly, on a [Streamable HTTP endpoint](https://modelcontextprotocol.io/docs/concepts/transports#streamable-http) at `/v1/mcp`. Four tools are surfaced:

*   `weaviate-collections-get-config` — let the LLM inspect what collections exist and what properties they have
*   `weaviate-tenants-list` — list tenants when you're using multi-tenancy
*   `weaviate-query-hybrid` — run hybrid (BM25 + vector) search
*   `weaviate-objects-upsert` — write objects back, only when write access is enabled

Hybrid search is the most concrete reason this stack works for a coding assistant. Code is a mix of identifiers and intent. BM25 nails the identifiers. Vectors nail the intent. A query like "where do we handle retry on 429?" wants both at once: vectors find the semantically related retry code, BM25 anchors on `429` as an exact token. Pure-vector retrieval drops the integer match. Pure-BM25 misses any wording the user didn't already know. Hybrid wins on this kind of mixed-intent query.

Operational simplicity is the second reason. Competing stacks run an MCP server alongside the vector database. That's a second service to watch in production. Weaviate ships the MCP server inside the database, on the same port, with the same auth. The thing you have to monitor is just Weaviate.

The third reason is [multi-tenancy](https://docs.weaviate.io/weaviate/manage-collections/multi-tenancy). One Weaviate instance can hold many codebases, each isolated as a tenant. For an organization with multiple repos, that's one cluster instead of one-per-team.

`Weaviate MCP vs function calling` comes up as a natural question. Function calling is per-LLM-API. MCP is transport-level: any client that speaks MCP can call any server that speaks MCP, no rewrites. Build the retrieval once, use it from Claude Code, Cursor, and VS Code without translating.

![Image 2: Architecture: Claude Code, Cursor, and VS Code connecting via MCP to Weaviate, which ingests source code and documentation chunks](https://weaviate.io/assets/images/architecture-173a7b0887d259eeb9e04535538b7958.png)

## Step 1: Run Weaviate with MCP enabled[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-1-run-weaviate "Direct link to Step 1: Run Weaviate with MCP enabled")

The MCP server is disabled by default. Two environment variables turn it on:

`# docker-compose.ymlservices:  weaviate:    image: cr.weaviate.io/semitechnologies/weaviate:1.37.1    ports:      - '8080:8080'      - '50051:50051'    environment:      MCP_SERVER_ENABLED: 'true'      MCP_SERVER_WRITE_ACCESS_ENABLED: 'true'      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'      DEFAULT_VECTORIZER_MODULE: 'text2vec-openai'      ENABLE_MODULES: 'text2vec-openai'      OPENAI_APIKEY: ${OPENAI_APIKEY}`

`MCP_SERVER_ENABLED` exposes the read tools (config, tenants, hybrid query). `MCP_SERVER_WRITE_ACCESS_ENABLED` adds the upsert tool, which lets the agent write findings back. Skip it if you only want retrieval.

Honestly, I'd skip it for a while even if you think you want write-back. Read-only MCP covers most of what a coding agent actually does, and you sidestep a class of failure modes where the agent writes nonsense back into your knowledge base. Turn write access on once you have a specific use case that justifies the risk.

Auth for production

This example uses `AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'` so the post stays focused on the MCP wiring. For any networked deployment, enable an API key and add `Authorization: Bearer <key>` to your client config — Weaviate's MCP server respects standard auth and RBAC. See [§"Going further"](https://weaviate.io/blog/coding-assistant-weaviate-mcp#going-further) for the RBAC permissions involved.

Bring it up and confirm the endpoint is alive. Streamable HTTP requires an `initialize` handshake before any other call, so the liveness probe sends one:

`docker compose up -dcurl -sf -X POST http://localhost:8080/v1/mcp \  -H 'Content-Type: application/json' \  -H 'Accept: application/json, text/event-stream' \  -d '{    "jsonrpc":"2.0","id":0,"method":"initialize",    "params":{      "protocolVersion":"2025-03-26",      "capabilities":{},      "clientInfo":{"name":"curl","version":"1"}    }  }'`

A live MCP server returns a JSON-RPC envelope describing the server's capabilities and sets an `Mcp-Session-Id` response header that subsequent calls must echo back. You don't need to parse the body for a sanity check — a non-empty response is enough. If you get a connection refused or a 404, MCP isn't enabled.

## Step 2: Design the schema[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-2-design-the-schema "Direct link to Step 2: Design the schema")

Two collections, one for code chunks and one for documentation chunks, sharing the same Weaviate instance:

`import weaviatefrom weaviate.classes.config import Property, DataType, Tokenization, Configureclient = weaviate.connect_to_local()client.collections.create(    name="CodeChunks",    properties=[        Property(name="content", data_type=DataType.TEXT,                 tokenization=Tokenization.WORD),        Property(name="symbol", data_type=DataType.TEXT,                 tokenization=Tokenization.LOWERCASE),        Property(name="file_path", data_type=DataType.TEXT,                 tokenization=Tokenization.FIELD),        Property(name="language", data_type=DataType.TEXT,                 tokenization=Tokenization.FIELD),        Property(name="repo", data_type=DataType.TEXT,                 tokenization=Tokenization.FIELD),    ],    vector_config=Configure.Vectors.text2vec_openai(),)client.collections.create(    name="DocChunks",    properties=[        Property(name="content", data_type=DataType.TEXT,                 tokenization=Tokenization.WORD),        Property(name="title", data_type=DataType.TEXT,                 tokenization=Tokenization.WORD),        Property(name="source_url", data_type=DataType.TEXT,                 tokenization=Tokenization.FIELD),    ],    vector_config=Configure.Vectors.text2vec_openai(),)`

The [tokenization choices matter](https://docs.weaviate.io/weaviate/concepts/indexing/inverted-index#tokenization). `symbol` uses `lowercase` so `connect_to_local` is one token instead of three. `file_path`, `language`, and `repo` use `field` so they match exactly. Prose properties (`content`, `title`) use `word`. If this section feels familiar, the [tokenization post](https://weaviate.io/blog/tokenization-text-analysis-weaviate) explains why each method belongs where.

## Step 3: Chunk and ingest the codebase[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-3-ingest-codebase "Direct link to Step 3: Chunk and ingest the codebase")

Naive line-based chunking destroys code. A function split across two chunks loses its signature on one side and its body on the other. The fix is to chunk along syntactic boundaries: one chunk per function, one per class, one per top-level statement.

Python's standard library is enough for Python code (no extra dependency). For other languages, [tree-sitter](https://tree-sitter.github.io/tree-sitter/) is the standard choice (10+ languages, AST-aware, fast).

`import astfrom pathlib import Pathdef chunk_python_file(path: Path) -> list[dict]:    """Emit one chunk per top-level function or class."""    source = path.read_text()    tree = ast.parse(source)    lines = source.splitlines()    chunks = []    for node in ast.iter_child_nodes(tree):        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):            start = node.lineno - 1            end = node.end_lineno            chunks.append({                "content": "\n".join(lines[start:end]),                "symbol": node.name,                "file_path": str(path),                "language": "python",                "repo": "my-service",            })    return chunks`

Batch-ingest with the standard Weaviate batch pattern:

`code_chunks = client.collections.get("CodeChunks")with code_chunks.batch.dynamic() as batch:    for py_file in Path("./src").rglob("*.py"):        for chunk in chunk_python_file(py_file):            batch.add_object(properties=chunk)`

Weaviate vectorizes each chunk on insert via the configured [`text2vec-openai`](https://docs.weaviate.io/weaviate/model-providers/openai/embeddings) module, so there's no separate embedding step. Replace the vectorizer with `text2vec-voyageai` (Voyage's `voyage-code-2` is purpose-built for code) or `text2vec-cohere` if you want a different embedding family.

## Step 4: Chunk and ingest documentation[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-4-ingest-docs "Direct link to Step 4: Chunk and ingest documentation")

Prose chunks differently. Headings are real boundaries. A useful default is "split on H2, then on H3 if a section is too long":

`import redef chunk_markdown(text: str, max_chars: int = 1500) -> list[str]:    sections = re.split(r"(?m)^## ", text)    chunks = []    for section in sections:        if len(section) <= max_chars:            chunks.append(section.strip())        else:            for sub in re.split(r"(?m)^### ", section):                chunks.append(sub.strip())    return [c for c in chunks if c]doc_chunks = client.collections.get("DocChunks")with doc_chunks.batch.dynamic() as batch:    for md_file in Path("./docs").rglob("*.md"):        text = md_file.read_text()        title = md_file.stem        for content in chunk_markdown(text):            batch.add_object(properties={                "content": content,                "title": title,                "source_url": f"https://docs.example.com/{md_file.stem}",            })`

Two collections, two chunking strategies, one Weaviate instance. The MCP server exposes both through the same `weaviate-query-hybrid` tool. The agent picks which collection to query.

## Step 5: Connect Claude Code, Cursor, and VS Code[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#step-5-connect-clients "Direct link to Step 5: Connect Claude Code, Cursor, and VS Code")

The MCP transport is HTTP, so client config is small. Each client has its own file. All three point at the same Weaviate endpoint.

**[Claude Code](https://code.claude.com/docs/en/mcp)** (`~/.claude.json`):

`{  "mcpServers": {    "weaviate": {      "type": "http",      "url": "http://localhost:8080/v1/mcp"    }  }}`

Or via the CLI:

`claude mcp add weaviate http://localhost:8080/v1/mcp --transport http`

**[Cursor](https://docs.cursor.com/context/model-context-protocol)** (`~/.cursor/mcp.json` or project-local `.cursor/mcp.json`):

`{  "mcpServers": {    "weaviate": {      "url": "http://localhost:8080/v1/mcp"    }  }}`

**[VS Code with Copilot](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)** (`.vscode/mcp.json`):

`{  "servers": {    "weaviate": {      "type": "http",      "url": "http://localhost:8080/v1/mcp"    }  }}`

Restart the client. The Weaviate tools (`weaviate-query-hybrid`, `weaviate-collections-get-config`, etc.) should appear in the client's tool list. If they don't, check that `MCP_SERVER_ENABLED=true` is set and that the port is reachable.

## Try it out[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#try-it-out "Direct link to Try it out")

Open Claude Code in any directory after the runbook below has finished. Ask something specific to FastAPI internals that a generic model would only paraphrase from training data:

> "How does FastAPI handle dependency injection — show me the actual resolver."

Without MCP, Claude Code paraphrases the FastAPI [dependency injection](https://fastapi.tiangolo.com/tutorial/dependencies/) docs from training. With MCP, it calls `weaviate-query-hybrid` against `CodeChunks`, the BM25 half nails identifiers like `Depends` and `solve_dependencies`, the vector half pulls in nearby resolver code, and the answer cites real lines from `fastapi/dependencies/utils.py`.

Try a docs query:

> "When should I use `async def` versus `def` in FastAPI route handlers?"

Same shape, different collection. The agent queries `DocChunks`, returns the relevant section from FastAPI's [`async def` versus `def`](https://fastapi.tiangolo.com/async/) guide, and answers with the actual recommendation rather than guessing.

The general pattern: the agent decides per-question whether code, docs, or both are relevant, and pulls the chunks that are. Context size stays bounded. The repo can be huge.

![Image 3: Hybrid retrieval for code search: BM25 lane matches identifiers, vector lane matches semantic intent, fused result feeds Claude Code](https://weaviate.io/assets/images/hybrid-retrieval-fcce975b20bfaa162179ef48893ba8d1.png)

### Agent runbook: autonomous setup[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#agent-runbook "Direct link to Agent runbook: autonomous setup")

The narrative above is for humans. If you are an agent (Claude Code, Cursor, or any MCP-aware assistant) executing this end-to-end, the dropdown below is the contract: ordered steps, full scripts, success criteria. Run them in order. Each step prints a marker the next step can check.

**Autonomous setup runbook** — copy these scripts, run in order

## Going further[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#going-further "Direct link to Going further")

A few directions worth picking up after the basics work:

*   **Multi-repo organizations**: Switch the schema to multi-tenant and create one tenant per repo. The `weaviate-tenants-list` MCP tool gives the agent a way to discover them.

*   **Auth and RBAC**: Weaviate's MCP server respects standard authentication. Three RBAC permissions (`read_mcp`, `create_mcp`, `update_mcp`) control who can do what. Hand out read-only MCP credentials to most users; reserve write access for trusted agents.

*   **Agent write-back**: With write access on, the agent can persist its own findings (postmortem notes, cross-references it discovered, summaries of long-running work) back into Weaviate. The next session inherits them. This is what shifts Weaviate from a passive retrieval engine into long-term memory for the coding agent.

*   **Embedding choice**: `text2vec-openai` is fine for most code. Voyage's `voyage-code-2` is better if you can swap it in. For fully local setups, point Weaviate at an Ollama-served embedding model.

## Summary[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#summary "Direct link to Summary")

A coding assistant that doesn't know your code is a generic chatbot. The build is straightforward: index the codebase along syntactic boundaries, index the docs along heading boundaries, point your LLM client at the database via MCP, and let the agent retrieve only what it needs per query.

Weaviate simplifies this setup by running the MCP server inside the database. Hybrid search and multi-tenancy are enabled in the MCP service by default and writing directly to the database is one env var away. Spin it up, point Claude Code at it, and start asking questions about your actual code.

To go deeper:

*   The [Weaviate MCP server release notes](https://weaviate.io/blog/weaviate-1-37-release)
*   The [`weaviate/mcp-server-weaviate` GitHub repository](https://github.com/weaviate/mcp-server-weaviate)
*   The [official MCP protocol docs](https://modelcontextprotocol.io/docs/develop/build-server)
*   The [tokenization post](https://weaviate.io/blog/tokenization-text-analysis-weaviate) for the per-property tokenization rationale
*   Related blog posts: [What is agentic RAG](https://weaviate.io/blog/what-is-agentic-rag) and [Hybrid search explained](https://weaviate.io/blog/hybrid-search-explained)

## Ready to start building?[​](https://weaviate.io/blog/coding-assistant-weaviate-mcp#ready-to-start-building "Direct link to Ready to start building?")

Check out the [Quickstart tutorial](https://docs.weaviate.io/weaviate/quickstart), or build amazing apps with a free trial of [Weaviate Cloud (WCD)](https://console.weaviate.cloud/).
