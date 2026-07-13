Title: Introducing Storage Regions on the HF Hub

URL Source: https://huggingface.co/blog/regions

Published Time: 2023-11-03T00:00:00.302Z

Markdown Content:
[Back to Articles](https://huggingface.co/blog)

[![Image 1: Eliott Coyac's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/61d2f90c3c2083e1c08af22d/jn21aKijwBnopk7aUJUkq.png)](https://huggingface.co/coyotte508)

[![Image 2: Remy's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/1671192499617-6297ba850bd2f58c647995b9.jpeg)](https://huggingface.co/rtrm)

[![Image 3: Adrien Carreira's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/61a5dcedf14aa6d7c74925f7/ZbVN8MsvjWwanqOwUdIeC.png)](https://huggingface.co/XciD)

[![Image 4: Michelle Habonneau's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/62175099ae3a893ac7ce86a7/ZSFoej_60rG-hT-gmo3Pr.jpeg)](https://huggingface.co/michellehbn)

[![Image 5: Violette's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/1638698875017-noauth.jpeg)](https://huggingface.co/Violette)

[![Image 6: Julien Chaumond's avatar](https://cdn-avatars.huggingface.co/v1/production/uploads/5dd96eb166059660ed1ee413/NQtzmrDdbG0H8qkZvRyGk.jpeg)](https://huggingface.co/julien-c)

*   [Org settings](https://huggingface.co/blog/regions#org-settings "Org settings")

*   [Repository Tag](https://huggingface.co/blog/regions#repository-tag "Repository Tag")

*   [Regulatory and legal compliance](https://huggingface.co/blog/regions#regulatory-and-legal-compliance "Regulatory and legal compliance")

*   [Performance](https://huggingface.co/blog/regions#performance "Performance")

As part of our [Enterprise Hub](https://huggingface.co/enterprise) plan, we recently released support for **Storage Regions**.

Regions let you decide where your org's models and datasets will be stored. This has two main benefits, which we'll briefly go over in this blog post:

*   **Regulatory and legal compliance**, and more generally, better digital sovereignty
*   **Performance** (improved download and upload speeds and latency)

Currently we support the following regions:

*   US 🇺🇸
*   EU 🇪🇺
*   coming soon: Asia-Pacific 🌏

But first, let's see how to setup this feature in your organization's settings 🔥

## [](https://huggingface.co/blog/regions#org-settings) Org settings

If your organization is not an Enterprise Hub org yet, you will see the following screen:

[![Image 7](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/storage-regions/no-feature.png)](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/storage-regions/no-feature.png)

As soon as you subscribe, you will be able to see the Regions settings page:

[![Image 8](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/storage-regions/feature-annotated.png)](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/storage-regions/feature-annotated.png)

On that page you can see:

*   an audit of where your orgs' repos are currently located
*   dropdowns to select where your repos will be created

## [](https://huggingface.co/blog/regions#repository-tag) Repository Tag

Any repo (model or dataset) stored in a non-default location will display its Region directly as a tag. That way your organization's members can see at a glance where repos are located.

[![Image 9](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/storage-regions/tag-on-repo.png)](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/storage-regions/tag-on-repo.png)

## [](https://huggingface.co/blog/regions#regulatory-and-legal-compliance) Regulatory and legal compliance

In many regulated industries, you may have a requirement to store your data in a specific area.

For companies in the EU, that means you can use the Hub to build ML in a GDPR compliant way: with datasets, models and inference endpoints all stored within EU data centers.

If you are an Enterprise Hub customer and have further questions about this, please get in touch!

## [](https://huggingface.co/blog/regions#performance) Performance

Storing your models or your datasets closer to your team and infrastructure also means significantly improved performance, for both uploads and downloads.

This makes a big difference considering model weights and dataset files are usually very large.

[![Image 10](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/storage-regions/upload-speed.png)](https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/hub/storage-regions/upload-speed.png)

As an example, if you are located in Europe and store your repositories in the EU region, you can expect to see ~4-5x faster upload and download speeds vs. if they were stored in the US.
