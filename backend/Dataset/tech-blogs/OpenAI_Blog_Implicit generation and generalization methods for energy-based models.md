Title: Implicit generation and generalization methods for energy-based models

URL Source: https://openai.com/index/energy-based-models

Markdown Content:
[Skip to main content](https://openai.com/index/energy-based-models#main)

[](https://openai.com/)

*   [Research](https://openai.com/research/index/)
*   Products
*   [Business](https://openai.com/business/)
*   [Developers](https://openai.com/api/)
*   [Company](https://openai.com/about/)
*   [Foundation(opens in a new window)](https://openaifoundation.org/)

Log in[Try ChatGPT(opens in a new window)](https://chatgpt.com/?openaicom-did=f8cd170c-f4ef-4805-9f34-f8a4ac32f6c5&openaicom_referred=true)

*   Research
*   Products
*   Business
*   Developers
*   Company
*   [Foundation(opens in a new window)](https://openaifoundation.org/)

Implicit generation and generalization methods for energy-based models | OpenAI

March 21, 2019

[Publication](https://openai.com/research/index/publication/)

# Implicit generation and generalization methods for energy-based models

[Read paper(opens in a new window)](http://arxiv.org/abs/1903.08689)[(opens in a new window)](https://sites.google.com/view/igebm)

![Image 1: Implicit Generation And Generalization Methods For Energy Based Models](https://images.ctfassets.net/kftzwdyauwt9/6d9752a0-b6e4-4cab-75e7a40c4e07/9475aed9016fe5f38846089722728321/image-21.webp?w=3840&q=90&fm=webp)

Loading…

[Audio 2](https://openai.com/index/energy-based-models)

Share

Generation

*   [Generation](https://openai.com/index/energy-based-models#generation) 
*   [Generalization](https://openai.com/index/energy-based-models#generalization) 
*   [Lessons learned](https://openai.com/index/energy-based-models#lessons-learned) 
*   [Next steps](https://openai.com/index/energy-based-models#next-steps) 

Table of contents

*   [Generation](https://openai.com/index/energy-based-models#generation) 
*   [Generalization](https://openai.com/index/energy-based-models#generalization) 
*   [Lessons learned](https://openai.com/index/energy-based-models#lessons-learned) 
*   [Next steps](https://openai.com/index/energy-based-models#next-steps) 

We’ve made progress towards stable and scalable training of[energy-based models⁠(opens in a new window)](http://yann.lecun.com/exdb/publis/pdf/lecun-06.pdf)(EBMs) resulting in better sample quality and generalization ability than existing models. Generation in EBMs spends more compute to continually refine its answers and doing so can generate samples competitive with[GANs⁠(opens in a new window)](https://arxiv.org/abs/1406.2661)at low temperatures,while also having mode coverage guarantees of[likelihood-based models⁠(opens in a new window)](https://arxiv.org/abs/1606.05328). We hope these findings stimulate further research into this promising class of models.

[Generative modeling⁠(opens in a new window)](https://blog.openai.com/generative-models/)is the task of observing data, such as images or text, and learning to model the underlying data distribution. Accomplishing this task leads models to understand high level features in data and synthesize examples that look like real data. Generative models have many applications in natural language, robotics, and computer vision.

Energy-based models represent probability distributions over data by assigning an unnormalized probability scalar (or “energy”) to each input data point. This provides useful modeling flexibility—any arbitrary model that outputs a real number given an input can be used as an energy model. The difficulty however, lies in sampling from these models.

To generate samples from EBMs, we use an iterative refinement process based on[Langevin dynamics⁠(opens in a new window)](https://en.wikipedia.org/wiki/Langevin_dynamics). Informally, this involves performing noisy gradient descent on the energy function to arrive at low-energy configurations ([see paper for more details⁠(opens in a new window)](http://arxiv.org/abs/1903.08689)). Unlike[GANs⁠(opens in a new window)](https://arxiv.org/abs/1406.2661),[VAEs⁠(opens in a new window)](https://www.ics.uci.edu/~welling/publications/papers/AEVB_ICLR14.pdf), and[Flow-based models⁠(opens in a new window)](https://arxiv.org/abs/1902.00275), this approach does not require an explicit neural network to generate samples - samples are generated implicitly. The combination of EBMs and iterative refinement have the following benefits:

*   **Adaptive computation time**. We can run sequential refinement for long amount of time to generate sharp, diverse samples or a short amount of time for coarse less diverse samples. In the limit of infinite time, this procedure is[known to⁠(opens in a new window)](https://www.ics.uci.edu/~welling/publications/papers/stoclangevin_v6.pdf)generate true samples from the energy model.
*   **Not restricted by generator network**. In both VAEs and Flow based models, the generator must learn a map from a continuous space to a possibly disconnected space containing different data modes, which requires large capacity and may not be possible to learn. In EBMs, by contrast, can easily learn to assign low energies at disjoint regions.
*   **Built-in compositionality**. Since each model represents an unnormalized probability distribution, models can be naturally combined through[product of experts⁠(opens in a new window)](http://www.cs.toronto.edu/~fritz/absps/icann-99.pdf)or other hierarchical models.

## Generation

We found energy-based models are able to generate qualitatively and quantitatively high-quality images, especially when running the refinement process for a longer period at test time. By running iterative optimization on individual images, we can auto-complete images and morph images from one class (such as truck) to another (such as frog).

![Image 2](https://cdn.openai.com/energy-based-models/completion-a1.png)![Image 3](https://cdn.openai.com/energy-based-models/completion-a2.png)![Image 4](https://cdn.openai.com/energy-based-models/completion-a3.png)![Image 5](https://cdn.openai.com/energy-based-models/completion-a4.png)![Image 6](https://cdn.openai.com/energy-based-models/completion-a5.png)![Image 7](https://cdn.openai.com/energy-based-models/completion-a6.png)![Image 8](https://cdn.openai.com/energy-based-models/completion-a7.png)![Image 9](https://cdn.openai.com/energy-based-models/completion-a8.png)

Test images 1

![Image 10](https://cdn.openai.com/energy-based-models/completion-b1.png)![Image 11](https://cdn.openai.com/energy-based-models/completion-b2.png)![Image 12](https://cdn.openai.com/energy-based-models/completion-b3.png)![Image 13](https://cdn.openai.com/energy-based-models/completion-b4.png)![Image 14](https://cdn.openai.com/energy-based-models/completion-b5.png)![Image 15](https://cdn.openai.com/energy-based-models/completion-b6.png)![Image 16](https://cdn.openai.com/energy-based-models/completion-b7.png)![Image 17](https://cdn.openai.com/energy-based-models/completion-b8.png)

Test images 2

![Image 18](https://cdn.openai.com/energy-based-models/completion-c1.png)![Image 19](https://cdn.openai.com/energy-based-models/completion-c2.png)![Image 20](https://cdn.openai.com/energy-based-models/completion-c3.png)![Image 21](https://cdn.openai.com/energy-based-models/completion-c4.png)![Image 22](https://cdn.openai.com/energy-based-models/completion-c5.png)![Image 23](https://cdn.openai.com/energy-based-models/completion-c6.png)![Image 24](https://cdn.openai.com/energy-based-models/completion-c7.png)![Image 25](https://cdn.openai.com/energy-based-models/completion-c8.png)

Test images 3

![Image 26](https://cdn.openai.com/energy-based-models/completion-d1.png)![Image 27](https://cdn.openai.com/energy-based-models/completion-d2.png)![Image 28](https://cdn.openai.com/energy-based-models/completion-d3.png)![Image 29](https://cdn.openai.com/energy-based-models/completion-d4.png)![Image 30](https://cdn.openai.com/energy-based-models/completion-d5.png)![Image 31](https://cdn.openai.com/energy-based-models/completion-d6.png)![Image 32](https://cdn.openai.com/energy-based-models/completion-d7.png)![Image 33](https://cdn.openai.com/energy-based-models/completion-d8.png)

Test images 4

Original Completions Corruption

Image completions on conditional ImageNet model. Our models exhibit diversity in inpainting. Note that inputs are from test distribution and are not model samples, indicating coverage of test data.

![Image 34](https://cdn.openai.com/energy-based-models/cc-deer-1.png)Deer

![Image 35](https://cdn.openai.com/energy-based-models/cc-car.png)Car

![Image 36](https://cdn.openai.com/energy-based-models/cc-frog-2.png)Frog

![Image 37](https://cdn.openai.com/energy-based-models/cc-bird.png)Bird

![Image 38](https://cdn.openai.com/energy-based-models/cc-airplane.png)Airplane

![Image 39](https://cdn.openai.com/energy-based-models/cc-truck-2.png)Truck

![Image 40](https://cdn.openai.com/energy-based-models/cc-frog-1.png)Frog

![Image 41](https://cdn.openai.com/energy-based-models/cc-ship-2.png)Ship

![Image 42](https://cdn.openai.com/energy-based-models/cc-ship-3.png)Ship

![Image 43](https://cdn.openai.com/energy-based-models/cc-ship-1.png)Ship

![Image 44](https://cdn.openai.com/energy-based-models/cc-truck-1.png)Truck

![Image 45](https://cdn.openai.com/energy-based-models/cc-deer-2.png)Deer

Cross-class implicit sampling on a conditional model. The model is conditioned on a particular class but is initialized with an image from a separate class.

In addition to generating images, we found that energy-based models are able to generate stable robot dynamics trajectories across large number of timesteps. EBMs can generate a diverse set of possible futures, while feedforward models collapse to a mean prediction.

![Image 46](https://cdn.openai.com/energy-based-models/traj-a1.png)![Image 47](https://cdn.openai.com/energy-based-models/traj-a2.png)![Image 48](https://cdn.openai.com/energy-based-models/traj-a3.png)![Image 49](https://cdn.openai.com/energy-based-models/traj-a4.png)![Image 50](https://cdn.openai.com/energy-based-models/traj-a5.png)

Ground truth

![Image 51](https://cdn.openai.com/energy-based-models/traj-b1.png)![Image 52](https://cdn.openai.com/energy-based-models/traj-b2.png)![Image 53](https://cdn.openai.com/energy-based-models/traj-b3.png)![Image 54](https://cdn.openai.com/energy-based-models/traj-b4.png)![Image 55](https://cdn.openai.com/energy-based-models/traj-b5.png)

Fully connected

![Image 56](https://cdn.openai.com/energy-based-models/traj-c1.png)![Image 57](https://cdn.openai.com/energy-based-models/traj-c2.png)![Image 58](https://cdn.openai.com/energy-based-models/traj-c3.png)![Image 59](https://cdn.openai.com/energy-based-models/traj-c4.png)![Image 60](https://cdn.openai.com/energy-based-models/traj-c5.png)

EBM sample 1

![Image 61](https://cdn.openai.com/energy-based-models/traj-d1.png)![Image 62](https://cdn.openai.com/energy-based-models/traj-d2.png)![Image 63](https://cdn.openai.com/energy-based-models/traj-d3.png)![Image 64](https://cdn.openai.com/energy-based-models/traj-d4.png)![Image 65](https://cdn.openai.com/energy-based-models/traj-d5.png)

EBM sample 2

T = 0 T = 20 T = 40 T = 60 T = 80

Top down views of robot hand manipulation trajectories generated unconditionally from the same starting state (1st frame). The FC network predicts a hand that does not move, while the EBM is able to generate distinctively different trajectories that are feasible.

## Generalization

We tested energy-based models on classifying several different[out-of-distribution datasets⁠(opens in a new window)](https://arxiv.org/abs/1610.02136)and found that energy-based models outperform other likelihood models such as Flow based and autoregressive models. We also tested classification using conditional energy-based models, and found that the resultant classification exhibited good generalization to adversarial perturbations. Our model—despite never being trained for classification—performed classification better than models explicitly trained against[adversarial perturbations⁠(opens in a new window)](https://arxiv.org/pdf/1712.02328.pdf).

## Lessons learned

We found evidence that suggest the following observations, though in no way are we certain that these observations are correct:

*   We found it difficult to apply vanilla HMC to EBM training as optimal step sizes and leapfrog simulation numbers differ greatly during training, though applying adaptive HMC would be an interesting extension.
*   We found training ensembles of energy functions (sampling and evaluating on ensembles) to help a bit, but was not worth the added complexity.
*   We didn’t ﬁnd much success adding a gradient penalty term, as it seemed to hurt model capacity and sampling.

More tips, observations and failures from this research can be found in[Section A.8 of the paper⁠(opens in a new window)](http://arxiv.org/abs/1903.08689).

## Next steps

We found preliminary indications that we can compose multiple energy-based models via a product of experts model. We trained one model on different size shapes at a set position and another model on same size shape at different positions. By combining the resultant energy-based models, we were able to generate different size shapes at different locations, despite never seeing examples of both being changed.

![Image 66](https://images.ctfassets.net/kftzwdyauwt9/6ad65792-3d3b-47e4-7383f0626321/1a3335c00dae0e0eefa75f78bcac7577/energy-1.png)

Energy flow visualization

![Image 67](https://images.ctfassets.net/kftzwdyauwt9/92b6b5ba-9d51-4f53-4bb54e328018/38cbafeddc57726368c104f046572572/energy-2.png)

Energy flow visualization

![Image 68](https://images.ctfassets.net/kftzwdyauwt9/bfddaf07-b6e6-4a82-066bb98551a7/ae79ad37b7945828382727ca226ebd85/energy-3.png)

Energy flow visualization

A 2D example of combining energy functions through their summation and the resulting sampling trajectories.

Compositionality is one of the[unsolved challenges⁠(opens in a new window)](http://web.stanford.edu/class/psych209/Readings/LakeEtAlBBS.pdf)facing AI systems today, and we are excited about what energy-based models can do here. If you are excited to work on energy-based models please consider[applying⁠](https://openai.com/careers/)to OpenAI!

*   [Generative Models](https://openai.com/research/index/?tags=generative-models)
*   [Learning Paradigms](https://openai.com/research/index/?tags=learning-paradigms)

## Authors

Yilun Du, Igor Mordatch

## Acknowledgments

Thanks to Ilya Sutskever, Greg Brockman, Bob McGrew, Johannes Otterbach, Jacob Steinhardt, Harri Edwards, Yura Burda, Jack Clark and Ashley Pilipiszyn for feedback on this blog post and manuscript.

## Related articles

[View all](https://openai.com/news/)

![Image 69: Hierarchical Text Conditional Image Generation With Clip Latents](https://images.ctfassets.net/kftzwdyauwt9/7c44eedc-3563-4438-c613706c52b1/fcfc38b26fd4878a3c6b4ca8d1d73b17/hierarchical-text-conditional-image-generation-with-clip-latents.jpg?w=3840&q=90&fm=webp)

[Hierarchical text-conditional image generation with CLIP latents Publication Apr 13, 2022](https://openai.com/index/hierarchical-text-conditional-image-generation-with-clip-latents/)

![Image 70: DALL·E](https://images.ctfassets.net/kftzwdyauwt9/ed21faee-ce44-4d91-f5cc39941d47/bdd3983530857e93d205304e219e2d95/dall-e.jpg?w=3840&q=90&fm=webp)

[DALL·E: Creating images from text Milestone Jan 5, 2021](https://openai.com/index/dall-e/)

![Image 71: Image GPT](https://images.ctfassets.net/kftzwdyauwt9/5ae77333-6ec9-4b5b-345335df9dfe/be9cfca3194bf819fbd8f45fd49a5185/image_127.png?w=3840&q=90&fm=webp)

[Image GPT Publication Jun 17, 2020](https://openai.com/index/image-gpt/)

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
*   [ChatGPT(opens in a new window)](https://chatgpt.com/?openaicom-did=f8cd170c-f4ef-4805-9f34-f8a4ac32f6c5&openaicom_referred=true)
*   [ChatGPT Business(opens in a new window)](https://chatgpt.com/business/?openaicom-did=f8cd170c-f4ef-4805-9f34-f8a4ac32f6c5&openaicom_referred=true)
*   [ChatGPT Enterprise(opens in a new window)](https://chatgpt.com/business/enterprise/?openaicom-did=f8cd170c-f4ef-4805-9f34-f8a4ac32f6c5&openaicom_referred=true)
*   [ChatGPT for Education(opens in a new window)](https://chatgpt.com/business/education/?openaicom-did=f8cd170c-f4ef-4805-9f34-f8a4ac32f6c5&openaicom_referred=true)
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

![Image 72](https://bat.bing.com/action/0?ti=187204252&Ver=2&mid=90138943-34ce-456b-b5ec-9ac953deede9&bo=1&sid=a99767e079be11f18855732cdc64cc05&vid=a9975ac079be11f1b6f707c8f1614108&vids=1&msclkid=N&pi=918639831&lg=en-US&sw=1280&sh=1280&sc=24&tl=Implicit%20generation%20and%20generalization%20methods%20for%20energy-based%20models%20%7C%20OpenAI&p=https%3A%2F%2Fopenai.com%2Findex%2Fenergy-based-models%2F&r=&lt=885&evt=pageLoad&sv=2&cdb=AQAQ&rn=981658)
