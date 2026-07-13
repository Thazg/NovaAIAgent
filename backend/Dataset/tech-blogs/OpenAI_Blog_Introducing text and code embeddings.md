Title: Introducing text and code embeddings

URL Source: https://openai.com/index/introducing-text-and-code-embeddings

Markdown Content:
Embeddings are numerical representations of concepts converted to number sequences, which make it easy for computers to understand the relationships between those concepts. Our embeddings outperform top models in 3 standard benchmarks, including a 20% relative improvement in code search.

Embeddings are useful for working with natural language and code, because they can be readily consumed and compared by other machine learning models and algorithms like clustering or search.

Embeddings that are numerically similar are also semantically similar. For example, the embedding vector of “canine companions say” will be more similar to the embedding vector of “woof” than that of“meow.”

![Image 1: Graph Of Similar Embeddings](https://images.ctfassets.net/kftzwdyauwt9/6feca3be-2b6b-4a99-fc14ed78f1ee/3373feb41e1f9f49ba2c0f1ce3332b8b/Graphofsimilarembeddings.svg?w=3840&q=90)

The new endpoint uses neural network models, which are descendants of GPT‑3, to map text and code to a vector representation—“embedding” them in a high-dimensional space. Each dimension captures some aspect of the input.

The new[/embeddings⁠(opens in a new window)](https://beta.openai.com/docs/api-reference/embeddings)endpoint in the[OpenAI API⁠(opens in a new window)](https://beta.openai.com/)provides text and code embeddings with a few lines of code:

    
```
import openai
response = openai.Embedding.create(
    input="canine companions say",
    engine="text-similarity-davinci-001")
```

We’re releasing three families of embedding models, each tuned to perform well on different functionalities: text similarity, text search, and code search. The models take either text or code as input and return an embedding vector.

Models Use Cases
Text similarity: Captures semantic similarity between pieces of text.text-similarity-{ada, babbage, curie, davinci}-001 Clustering, regression, anomaly detection, visualization
Text search: Semantic information retrieval over documents.text-search-{ada, babbage, curie, davinci}-{query, doc}-001 Search, context relevance, information retrieval
Code search: Find relevant code with a query in natural language.code-search-{ada, babbage}-{code, text}-001 Code search and relevance

## Text similarity models

Drag to pan, scroll or pinch to zoom

animal

athlete

film

transportation

village

 Embeddings from the `text-similarity-babbage-001` model, applied to the [DBpedia](https://www.kaggle.com/danofer/dbpedia-classes?select=DBPEDIA_val.csv) dataset. We randomly selected 100 samples from the dataset covering 5 categories, and computed the embeddings via the [/embeddings](https://platform.openai.com/docs/api-reference/embeddings) endpoint. The different categories show up as 5 clear clusters in the embedding space. To visualize the embedding space, we reduced the embedding dimensionality from 2048 to 3 using [PCA](https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.PCA.html). The code for how to visualize embedding space in 3D dimension is available [here](https://github.com/openai/openai-python/blob/main/examples/embeddings/Visualize_in_3d.ipynb). 

To compare the similarity of two pieces of text, you simply use the[dot product⁠(opens in a new window)](https://en.wikipedia.org/wiki/Dot_product)on the text embeddings. The result is a “similarity score”, sometimes called “[cosine similarity⁠(opens in a new window)](https://en.wikipedia.org/wiki/Dot_product#Application_to_the_law_of_cosines),” between –1 and 1, where a higher number means more similarity. In most applications, the embeddings can be pre-computed, and then the dot product comparison is extremely fast to carry out.

One popular use of embeddings is to use them as features in machine learning tasks, such as classification. In machine learning literature, when using a linear classifier, this classification task is called a “linear probe.” Our text similarity models achieve new state-of-the-art results on linear probe classification in[SentEval⁠(opens in a new window)](https://github.com/facebookresearch/SentEval)([Conneau et al., 2018⁠(opens in a new window)](https://arxiv.org/abs/1803.05449)), a commonly used benchmark for evaluating embedding quality.

## Linear probe classification over 7 datasets

`text-similarity-davinci-001`

92.2%

## Text search models

Text search models provide embeddings that enable large-scale search tasks, like finding a relevant document among a collection of documents given a text query. Embedding for the documents and query are produced separately, and then cosine similarity is used to compare the similarity between the query and each document.

Embedding-based search can generalize better than word overlap techniques used in classical keyword search, because it captures the semantic meaning of text and is less sensitive to exact phrases or words. We evaluate the text search model’s performance on the[BEIR⁠(opens in a new window)](https://github.com/UKPLab/beir)([Thakur, et al. 2021⁠(opens in a new window)](https://arxiv.org/abs/2104.08663)) search evaluation suite and obtain better search performance than previous methods. Our[text search guide⁠(opens in a new window)](https://beta.openai.com/docs/guides/embeddings/text-search-using-embeddings)provides more details on using embeddings for search tasks.

## Average accuracy over 11 search tasks in BEIR

`text-search-davinci-{doc, query}-001`

52.8%

## Code search models

## Average accuracy over 6 programming languages

`code-search-babbage-{doc, query}-001`

93.5%

## Examples of the embeddings API in action

### JetBrains Research

### FineTune Learning

[FineTune Learning⁠(opens in a new window)](https://finetunelearning.com/)is a company building hybrid human-AI solutions for learning, like[adaptive learning loops⁠(opens in a new window)](https://en.wikipedia.org/wiki/Adaptive_learning)that help students reach academic standards.

OpenAI’s embeddings significantly improved the task of finding textbook content based on learning objectives. Achieving a top-5 accuracy of 89.1%, OpenAI’s text-search-curie embeddings model outperformed previous approaches like Sentence-BERT (64.5%). While human experts are still better, the FineTune team is now able to label entire textbooks in a matter of seconds, in contrast to the hours that it took the experts.

### Fabius

[Fabius⁠(opens in a new window)](https://www.fabius.io/)helps companies turn customer conversations into structured insights that inform planning and prioritization. OpenAI’s embeddings allow companies to more easily find and tag customer call transcripts with feature requests.

For instance, customers might use words like “automated” or “easy to use” to ask for a better self-service platform. Previously, Fabius was using fuzzy keyword search to attempt to tag those transcripts with the self-service platform label. With OpenAI’s embeddings, they’re now able to find 2x more examples in general, and 6x–10x more examples for features with abstract use cases that don’t have a clear keyword customers might use.

All API customers can get started with the[embeddings documentation⁠(opens in a new window)](https://beta.openai.com/docs/guides/embeddings)for using embeddings in their applications.
