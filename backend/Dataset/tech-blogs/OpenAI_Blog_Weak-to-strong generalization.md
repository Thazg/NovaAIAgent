Title: Weak-to-strong generalization

URL Source: https://openai.com/index/weak-to-strong-generalization

Markdown Content:
[Skip to main content](https://openai.com/index/weak-to-strong-generalization#main)

[](https://openai.com/)

*   [Research](https://openai.com/research/index/)
*   Products
*   [Business](https://openai.com/business/)
*   [Developers](https://openai.com/api/)
*   [Company](https://openai.com/about/)
*   [Foundation(opens in a new window)](https://openaifoundation.org/)

Log in[Try ChatGPT(opens in a new window)](https://chatgpt.com/?openaicom-did=d7e9bc5a-2cb4-400e-a263-d989b399169c&openaicom_referred=true)

*   Research
*   Products
*   Business
*   Developers
*   Company
*   [Foundation(opens in a new window)](https://openaifoundation.org/)

Weak-to-strong generalization | OpenAI

December 14, 2023

[Safety](https://openai.com/news/safety-alignment/)

# Weak-to-strong generalization

[Read paper(opens in a new window)](https://cdn.openai.com/papers/weak-to-strong-generalization.pdf)

![Image 1: Weak To Strong Generalization](https://images.ctfassets.net/kftzwdyauwt9/1tCf4AONiCc3OkX47FmFy0/f95e25993d309257c631c4e64b699685/weak-to-strong-generalization.jpg?w=3840&q=90&fm=webp)

Justin Jay Wang × DALL·E

Listen to article

5:18

[Audio 2](https://openai.com/index/weak-to-strong-generalization)

Share

The superalignment problem

*   [The superalignment problem](https://openai.com/index/weak-to-strong-generalization#the-superalignment-problem) 
*   [Our setup](https://openai.com/index/weak-to-strong-generalization#our-setup) 
*   [Our results](https://openai.com/index/weak-to-strong-generalization#our-results) 
*   [Research opportunities](https://openai.com/index/weak-to-strong-generalization#research-opportunities) 

Table of contents

*   [The superalignment problem](https://openai.com/index/weak-to-strong-generalization#the-superalignment-problem) 
*   [Our setup](https://openai.com/index/weak-to-strong-generalization#our-setup) 
*   [Our results](https://openai.com/index/weak-to-strong-generalization#our-results) 
*   [Research opportunities](https://openai.com/index/weak-to-strong-generalization#research-opportunities) 

We present a new research direction for superalignment, together with promising initial results: can we leverage the generalization properties of deep learning to control strong models with weak supervisors?

A core challenge for aligning future superhuman AI systems (superalignment) is that humans will need to supervise AI systems much smarter than them. We study a simple analogy: can small models supervise large models? We show that we can use a GPT‑2‑level model to elicit most of GPT‑4’s capabilities—close to GPT‑3.5‑level performance—generalizing correctly even to hard problems where the small model failed. This opens up a new research direction that allows us to directly tackle a central challenge of aligning future superhuman models while making iterative empirical progress today.

## The superalignment problem

We believe superintelligence—AI vastly smarter than humans—could be developed within the next ten years. However, we still do not know how to reliably steer and control superhuman AI systems. Solving this problem is essential for ensuring that even the most advanced AI systems in the future remain safe and beneficial to humanity.

We formed the [Superalignment team⁠](https://openai.com/superalignment/) earlier this year to solve this problem of superintelligence alignment. Today, we are releasing the team’s first paper, which introduces a new research direction for empirically aligning superhuman models.

Current alignment methods, such as reinforcement learning from human feedback (RLHF), rely on human supervision. However, future AI systems will be capable of extremely complex and creative behaviors that will make it hard for humans to reliably supervise them. For example, superhuman models may be able to write millions of lines of novel—and potentially dangerous—computer code that would be very hard even for expert humans to understand.

Relative to superhuman AI models, humans will be “weak supervisors.” This is a core challenge for AGI alignment: how can weak supervisors trust and control substantially stronger models?

## Our setup

To make progress on this core challenge, we propose an analogy we can empirically study today: **can we use a smaller (less capable) model to supervise a larger (more capable) model?**

![Image 2: Superalignmentblog Artwork Transparent](https://images.ctfassets.net/kftzwdyauwt9/7f37b3a2-c7fa-4e5d-85517bd29a33/cc8ca2aa652e9edc6e724977f64b2c64/SuperAlignmentBlog_Artwork_Transparent.png?w=3840&q=90&fm=webp)

**A simple analogy for superalignment:** In traditional machine learning (ML), humans supervise AI systems weaker than themselves (left). To align superintelligence, humans will instead need to supervise AI systems smarter than them (center). We cannot directly study this problem today, but we can study a simple analogy: can small models supervise larger models (right)?

Naively, we might not expect a strong model to perform better than the weak supervisor that provides its training signal—it may simply learn to imitate all the errors the weak supervisor makes. On the other hand, strong pretrained models have excellent raw capabilities—we don't need to teach them new tasks from scratch, we just need to elicit their latent knowledge. The critical question is then: will the strong model generalize according to the weak supervisor's underlying intent—leveraging its full capabilities to solve the task even on difficult problems where the weak supervisor can only provide incomplete or flawed training labels?

## Our results

**Typical weak-to-strong generalization across NLP benchmarks:** We use a GPT-2-level model as a weak supervisor to finetune GPT-4.

We can significantly improve generalization in many settings. We use a simple method that encourages the strong model to be more confident—including confidently disagreeing with the weak supervisor if necessary. **When we supervise GPT‑4 with a GPT‑2‑level model using this method on NLP tasks, the resulting model typically performs somewhere between GPT‑3 and GPT‑3.5.** We are able to recover much of GPT‑4’s capabilities with only much weaker supervision.

This method is a proof of concept with important limitations; for example, it still doesn’t work on ChatGPT preference data. However, we also find signs of life with other approaches, such as optimal early stopping and bootstrapping from small to intermediate to large models.

Collectively, our results suggest that (1) naive human supervision—such as reinforcement learning from human feedback (RLHF)—could scale poorly to superhuman models without further work, but (2) it is feasible to substantially improve weak-to-strong generalization.

## Research opportunities

There are still important disanalogies between our current empirical setup and the ultimate problem of aligning superhuman models. For example, it may be easier for future models to imitate weak human errors than for current strong models to imitate current weak model errors, which could make generalization harder in the future.

Nevertheless, we believe our setup captures some key difficulties of aligning future superhuman models, enabling us to start making empirical progress on this problem today. There are many promising directions for future work, including fixing the disanalogies in our setup, developing better scalable methods, and advancing our scientific understanding of when and how we should expect good weak-to-strong generalization.

**We believe this is an exciting opportunity for the ML research community to make progress on alignment.** To kickstart more research in this area,

*   We are releasing [open source code⁠(opens in a new window)](https://github.com/openai/weak-to-strong) to make it easy to get started with weak-to-strong generalization experiments today.
*   We are launching a [$10 million grants program⁠](https://openai.com/index/superalignment-fast-grants/) for graduate students, academics, and other researchers to work on superhuman AI alignment broadly. We’re especially excited to support research related to weak-to-strong generalization.

Figuring out how to align future superhuman AI systems to be safe has never been more important, and it is now easier than ever to make empirical progress on this problem. We are excited to see what breakthroughs researchers discover.

*   [Alignment](https://openai.com/news/?tags=alignment)
*   [Framework](https://openai.com/news/?tags=framework)
*   [2023](https://openai.com/news/?tags=2023)

## Authors

Collin Burns, Jan Leike, Leopold Aschenbrenner, Jeffrey Wu, Pavel Izmailov, Leo Gao, Bowen Baker, Jan Hendrik Kirchner

## Contributors

Yining Chen, Adrien Ecoffet, Manas Joglekar, Ilya Sutskever, Greg Brockman, Hannah Wong, Kendra Rimbach, Elie Georges, Thomas Degry, Casey Martin, Lindsay McMenamin, Owen Cramp, Marc Hill

## Related articles

[View all](https://openai.com/news/)

![Image 3: Disrupting malicious > media](https://images.ctfassets.net/kftzwdyauwt9/5080983d-9c4d-4479-17e421d7380a/0b42f77c2478bc5bc7bde3fddfc68462/45.png?w=3840&q=90&fm=webp)

[Disrupting malicious uses of AI by state-affiliated threat actors Security Feb 14, 2024](https://openai.com/index/disrupting-malicious-uses-of-ai-by-state-affiliated-threat-actors/)

![Image 4](https://images.ctfassets.net/kftzwdyauwt9/ec66425e-99ca-4314-d04b087f8727/de7341b6a5281c2a220b93a737ce19b0/building-an-early-warning-system-for-llm-aided-biological-threat-creation.jpg?w=3840&q=90&fm=webp)

[Building an early warning system for LLM-aided biological threat creation Publication Jan 31, 2024](https://openai.com/index/building-an-early-warning-system-for-llm-aided-biological-threat-creation/)

![Image 5: Democratic Inputs To AI Grant Program Update](https://images.ctfassets.net/kftzwdyauwt9/f50ce1d2-4f61-4ed2-e560c624d631/6f4dd4542898a35d0a91b137f85c9834/Democratic_inputs_to_AI_grant_program_lessons_learned_and_implementation_plans.jpg?w=3840&q=90&fm=webp)

[Democratic inputs to AI grant program: lessons learned and implementation plans Safety Jan 16, 2024](https://openai.com/index/democratic-inputs-to-ai-grant-program-update/)

Research
*   [Research Index](https://openai.com/research/index/)
*   [Research Overview](https://openai.com/research/)
*   [Economic Research](https://openai.com/signals/)

Latest Advancements
*   [GPT-5.5](https://openai.com/index/introducing-gpt-5-5/)
*   [GPT-5.4](https://openai.com/index/introducing-gpt-5-4/)
*   [GPT-5.3 Instant](https://openai.com/index/gpt-5-3-instant/)

Safety
*   [Safety Approach](https://openai.com/safety/)
*   [Deployment Safety(opens in a new window)](https://deploymentsafety.openai.com/)
*   [Security & Privacy](https://openai.com/security-and-privacy/)
*   [Trust & Transparency](https://openai.com/trust-and-transparency/)

Products
*   [ChatGPT(opens in a new window)](https://chatgpt.com/?openaicom-did=d7e9bc5a-2cb4-400e-a263-d989b399169c&openaicom_referred=true)
*   [ChatGPT Business(opens in a new window)](https://chatgpt.com/business/?openaicom-did=d7e9bc5a-2cb4-400e-a263-d989b399169c&openaicom_referred=true)
*   [ChatGPT Enterprise(opens in a new window)](https://chatgpt.com/business/enterprise/?openaicom-did=d7e9bc5a-2cb4-400e-a263-d989b399169c&openaicom_referred=true)
*   [ChatGPT for Education(opens in a new window)](https://chatgpt.com/business/education/?openaicom-did=d7e9bc5a-2cb4-400e-a263-d989b399169c&openaicom_referred=true)
*   [Codex](https://openai.com/codex/)
*   [Release Notes](https://openai.com/products/release-notes/)

API Platform
*   [Overview](https://openai.com/api/)
*   [API Log In(opens in a new window)](https://platform.openai.com/login)
*   [Docs(opens in a new window)](https://developers.openai.com/api/docs)

Business
*   [Overview](https://openai.com/business/)
*   [Solutions](https://openai.com/solutions/)
*   [Resources](https://openai.com/business/learn/)
*   [Customer Stories](https://openai.com/business/customer-stories/)
*   [Partner Network](https://openai.com/business/partners/)
*   [Contact Sales](https://openai.com/contact-sales/)

Developers
*   [Apps SDK(opens in a new window)](https://developers.openai.com/apps-sdk)
*   [Open Models](https://openai.com/open-models/)
*   [Docs(opens in a new window)](https://developers.openai.com/)
*   [Resources(opens in a new window)](https://developers.openai.com/learn)
*   [Developer Forum(opens in a new window)](https://community.openai.com/)

Company
*   [About Us](https://openai.com/about/)
*   [Our Charter](https://openai.com/charter/)
*   [Careers](https://openai.com/careers/)
*   [News](https://openai.com/news/)

Support
*   [Help Center(opens in a new window)](https://help.openai.com/)

More
*   [Stories](https://openai.com/stories/)
*   [Academy](https://openai.com/academy/)
*   [Livestreams](https://openai.com/live/)
*   [Podcast](https://openai.com/podcast/)
*   [RSS](https://openai.com/news/rss.xml)

Terms & Policies
*   [Terms of Use](https://openai.com/policies/terms-of-use/)
*   [Privacy Policy](https://openai.com/policies/privacy-policy/)
*   [Other Policies](https://openai.com/policies/)

[(opens in a new window)](https://x.com/OpenAI)[(opens in a new window)](https://www.youtube.com/OpenAI)[(opens in a new window)](https://www.linkedin.com/company/openai)[(opens in a new window)](https://github.com/openai)[(opens in a new window)](https://www.instagram.com/openai/)[(opens in a new window)](https://www.tiktok.com/@openai)[(opens in a new window)](https://discord.gg/openai)

OpenAI © 2015–2026 Your privacy choices

English United States
