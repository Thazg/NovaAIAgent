Title: CLIP: Connecting text and images

URL Source: https://openai.com/index/clip

Markdown Content:
[Skip to main content](https://openai.com/index/clip#main)

[](https://openai.com/)

*   [Research](https://openai.com/research/index/)
*   Products
*   [Business](https://openai.com/business/)
*   [Developers](https://openai.com/api/)
*   [Company](https://openai.com/about/)
*   [Foundation(opens in a new window)](https://openaifoundation.org/)

Log in[Try ChatGPT(opens in a new window)](https://chatgpt.com/?openaicom-did=f190f099-f6d9-45d0-84f6-5fd6bb7509ec&openaicom_referred=true)

*   Research
*   Products
*   Business
*   Developers
*   Company
*   [Foundation(opens in a new window)](https://openaifoundation.org/)

CLIP: Connecting text and images | OpenAI

January 5, 2021

[Milestone](https://openai.com/research/index/milestone/)

# CLIP: Connecting text and images

[Read paper(opens in a new window)](https://arxiv.org/abs/2103.00020)[View code(opens in a new window)](https://github.com/openai/CLIP)

![Image 1: CLIP](https://images.ctfassets.net/kftzwdyauwt9/5e490f66-703f-4228-221ca64049ed/8ed4358ba4b9f8779e07a2b15d7256e1/image_125.png?w=3840&q=90&fm=webp)

Illustration:Justin Jay Wang

Listen to article

12:32

[Audio 2](https://openai.com/index/clip)

Share

Background and related work

*   [Background and related work](https://openai.com/index/clip#background-and-related-work) 
*   [Approach](https://openai.com/index/clip#approach) 
*   [Key takeaways](https://openai.com/index/clip#key-takeaways) 
*   [Limitations](https://openai.com/index/clip#limitations) 
*   [Broader impacts](https://openai.com/index/clip#broader-impacts) 
*   [Conclusion](https://openai.com/index/clip#conclusion) 

Table of contents

*   [Background and related work](https://openai.com/index/clip#background-and-related-work) 
*   [Approach](https://openai.com/index/clip#approach) 
*   [Key takeaways](https://openai.com/index/clip#key-takeaways) 
*   [Limitations](https://openai.com/index/clip#limitations) 
*   [Broader impacts](https://openai.com/index/clip#broader-impacts) 
*   [Conclusion](https://openai.com/index/clip#conclusion) 

We’re introducing a neural network called CLIP which efficiently learns visual concepts from natural language supervision. CLIP can be applied to any visual classification benchmark by simply providing the names of the visual categories to be recognized, similar to the “zero-shot” capabilities of GPT‑2 and GPT‑3.

Although deep learning has revolutionized computer vision, current approaches have several major problems: typical vision datasets are labor intensive and costly to create while teaching only a narrow set of visual concepts; standard vision models are good at one task and one task only, and require significant effort to adapt to a new task; and models that perform well on benchmarks have disappointingly poor performance on stress tests,[1](https://openai.com/index/clip#citation-bottom-1), [2](https://openai.com/index/clip#citation-bottom-2), [3](https://openai.com/index/clip#citation-bottom-3), [4](https://openai.com/index/clip#citation-bottom-4)casting doubt on the entire deep learning approach to computer vision.

We present a neural network that aims to address these problems: it is trained on a wide variety of images with a wide variety of natural language supervision that’s abundantly available on the internet. By design, the network can be instructed in natural language to perform a great variety of classification benchmarks, without directly optimizing for the benchmark’s performance, similar to the “[zero-shot⁠(opens in a new window)](https://en.wikipedia.org/wiki/Zero-shot_learning)” capabilities of GPT‑2[5](https://openai.com/index/clip#citation-bottom-5)and GPT‑3.[6](https://openai.com/index/clip#citation-bottom-6)This is a key change: by not directly optimizing for the benchmark, we show that it becomes much more representative: our system closes this “robustness gap” by up to 75% while matching the performance of the original ResNet-50[7](https://openai.com/index/clip#citation-bottom-7)on[ImageNet⁠(opens in a new window)](http://image-net.org/)zero-shot without using any of the original 1.28M labeled examples.

Although both models have the same accuracy on the ImageNet test set, CLIP’s performance is much more representative of how it will fare on datasets that measure accuracy in different, non-ImageNet settings. For instance, ObjectNet checks a model’s ability to recognize objects in many different poses and with many different backgrounds inside homes while ImageNet Rendition and ImageNet Sketch check a model’s ability to recognize more abstract depictions of objects.

## Background and related work

CLIP (_Contrastive Language–Image Pre-training_) builds on a large body of work on zero-shot transfer, natural language supervision, and multimodal learning. The idea of zero-data learning dates back over a decade[8](https://openai.com/index/clip#citation-bottom-8)but until recently was mostly studied in computer vision as a way of generalizing to unseen object categories.[9](https://openai.com/index/clip#citation-bottom-9), [10](https://openai.com/index/clip#citation-bottom-10)A critical insight was to leverage natural language as a flexible prediction space to enable generalization and transfer. In 2013, Richard Socher and co-authors at Stanford[11](https://openai.com/index/clip#citation-bottom-11)developed a proof of concept by training a model on CIFAR-10 to make predictions in a word vector embedding space and showed this model could predict two unseen classes. The same year DeVISE[12](https://openai.com/index/clip#citation-bottom-12)scaled this approach and demonstrated that it was possible to fine-tune an ImageNet model so that it could generalize to correctly predicting objects outside the original 1000 training set.

Most inspirational for CLIP is the work of Ang Li and his co-authors at FAIR[13](https://openai.com/index/clip#citation-bottom-13)who in 2016 demonstrated using natural language supervision to enable zero-shot transfer to several existing computer vision classification datasets, such as the canonical ImageNet dataset. They achieved this by fine-tuning an ImageNet CNN to predict a much wider set of visual concepts (visual n-grams) from the text of titles, descriptions, and tags of 30 million Flickr photos and were able to reach 11.5% accuracy on ImageNet zero-shot.

Finally, CLIP is part of a group of papers revisiting learning visual representations from natural language supervision in the past year. This line of work uses more modern architectures like the Transformer[32](https://openai.com/index/clip#citation-bottom-32)and includes VirTex,[33](https://openai.com/index/clip#citation-bottom-33)which explored autoregressive language modeling, ICMLM,[34](https://openai.com/index/clip#citation-bottom-34)which investigated masked language modeling, and ConVIRT,[35](https://openai.com/index/clip#citation-bottom-35)which studied the same contrastive objective we use for CLIP but in the field of medical imaging.

## Approach

We show that scaling a simple pre-training task is sufficient to achieve competitive zero-shot performance on a great variety of image classification datasets. Our method uses an abundantly available source of supervision: the text paired with images found across the internet. This data is used to create the following proxy training task for CLIP: given an image, predict which out of a set of 32,768 randomly sampled text snippets, was actually paired with it in our dataset.

In order to solve this task, our intuition is that CLIP models will need to learn to recognize a wide variety of visual concepts in images and associate them with their names. As a result, CLIP models can then be applied to nearly arbitrary visual classification tasks. For instance, if the task of a dataset is classifying photos of dogs vs cats we check for each image whether a CLIP model predicts the text description “a photo of a _dog_” or “a photo of a _cat_” is more likely to be paired with it.

![Image 2](https://images.ctfassets.net/kftzwdyauwt9/fbc4f633-9ad4-4dc2-3809c22df5e0/0bd2d5abf90d052731538613e4a42668/overview-a.svg)

Overview A

![Image 3](https://images.ctfassets.net/kftzwdyauwt9/d9d46e4b-6d6a-4f9e-59a242ea1441/c7b386880f1af005fd02f159de7f4d00/overview-b.svg)

Overview B

CLIP pre-trains an image encoder and a text encoder to predict which images were paired with which texts in our dataset. We then use this behavior to turn CLIP into a zero-shot classifier. We convert all of a dataset’s classes into captions such as “a photo of a dog” and predict the class of the caption CLIP estimates best pairs with a given image.

CLIP was designed to mitigate a number of major problems in the standard deep learning approach to computer vision:

**Costly datasets**: Deep learning needs a lot of data, and vision models have traditionally been trained on manually labeled datasets that are expensive to construct and only provide supervision for a limited number of predetermined visual concepts. The ImageNet dataset, one of the largest efforts in this space, required over 25,000 workers to annotate 14 million images for 22,000 object categories. In contrast, CLIP learns from text–image pairs that are already publicly available on the internet. Reducing the need for expensive large labeled datasets has been extensively studied by prior work, notably self-supervised learning,[14](https://openai.com/index/clip#citation-bottom-14), [15](https://openai.com/index/clip#citation-bottom-15), [16](https://openai.com/index/clip#citation-bottom-16)contrastive methods,[17](https://openai.com/index/clip#citation-bottom-17), [18](https://openai.com/index/clip#citation-bottom-18), [19](https://openai.com/index/clip#citation-bottom-19), [20](https://openai.com/index/clip#citation-bottom-20), [21](https://openai.com/index/clip#citation-bottom-21)self-training approaches,[22](https://openai.com/index/clip#citation-bottom-22), [23](https://openai.com/index/clip#citation-bottom-23)and generative modeling.[24](https://openai.com/index/clip#citation-bottom-24), [25](https://openai.com/index/clip#citation-bottom-25), [26](https://openai.com/index/clip#citation-bottom-26), [27](https://openai.com/index/clip#citation-bottom-27)

**Narrow**: An ImageNet model is good at predicting the 1000 ImageNet categories, but that’s all it can do “out of the box.” If we wish to perform any other task, an ML practitioner needs to build a new dataset, add an output head, and fine-tune the model. In contrast, CLIP can be adapted to perform a wide variety of visual classification tasks without needing additional training examples. To apply CLIP to a new task, all we need to do is “tell” CLIP’s text-encoder the names of the task’s visual concepts, and it will output a linear classifier of CLIP’s visual representations. The accuracy of this classifier is often competitive with fully supervised models.

We show random, non-cherry picked, predictions of zero-shot CLIP classifiers on examples from various datasets below.

Food101

**guacamole** (90.1%)Ranked 1 out of 101 labels

![Image 4](https://cdn.openai.com/clip/assets/zero-shot/zs_9.png)

a photo of **guacamole**, a type of food.

a photo of **ceviche**, a type of food.

a photo of **edamame**, a type of food.

a photo of **tuna tartare**, a type of food.

a photo of **hummus**, a type of food.

SUN397

**television studio** (90.2%)Ranked 1 out of 397 labels

![Image 5](https://cdn.openai.com/clip/assets/zero-shot/zs_5.png)

a photo of a **television studio**.

a photo of a **podium indoor**.

a photo of a **conference room**.

a photo of a **lecture room**.

a photo of a **control room**.

Youtube-BB

**airplane, person** (89.0%)Ranked 1 out of 23 labels

![Image 6](https://cdn.openai.com/clip/assets/zero-shot/zs_32.png)

a photo of a **airplane**.

a photo of a **bird**.

a photo of a **bear**.

a photo of a **giraffe**.

a photo of a **car**.

EuroSAT

**annual crop land** (46.5%)Ranked 4 out of 10 labels

![Image 7](https://cdn.openai.com/clip/assets/zero-shot/zs_3.png)

a centered satellite photo of **permanent crop land**.

a centered satellite photo of **pasture land**.

a centered satellite photo of **highway or road**.

a centered satellite photo of **annual crop land**.

a centered satellite photo of **brushland or shrubland**.

PatchCamelyon (PCam)

**healthy lymph node tissue** (77.2%)Ranked 2 out of 2 labels

![Image 8](https://cdn.openai.com/clip/assets/zero-shot/zs_15.png)

this is a photo of **lymph node tumor tissue**

this is a photo of **healthy lymph node tissue**

ImageNet-A (Adversarial)

**lynx** (47.9%)Ranked 5 out of 200 labels

![Image 9](https://cdn.openai.com/clip/assets/zero-shot/zs_8.png)

a photo of a **fox squirrel**.

a photo of a **mongoose**.

a photo of a **skunk**.

a photo of a **red fox**.

a photo of a **lynx**.

Show more

**Poor real-world performance**: Deep learning systems are often reported to achieve human or even superhuman performance[28](https://openai.com/index/clip#citation-bottom-28), [A](https://openai.com/index/clip#citation-bottom-A) on vision benchmarks, yet when deployed in the wild, their performance can be far below the expectation set by the benchmark. In other words, there is a gap between “benchmark performance” and “real performance.” We conjecture that this gap occurs because the models “cheat” by only optimizing for performance on the benchmark, much like a student who passed an exam by studying only the questions on past years’ exams. In contrast, the CLIP model can be evaluated on benchmarks without having to train on their data, so it can’t “cheat” in this manner. This results in its benchmark performance being much more representative of its performance in the wild. To verify the “cheating hypothesis”, we also measure how CLIP’s performance changes when it is able to “study” for ImageNet. When a linear classifier is fitted on top of CLIP’s features, it improves CLIP’s accuracy on the ImageNet test set by almost 10%. However, this classifier does _no better_ on average across an evaluation suite of 7 other datasets measuring “robust” performance.[30](https://openai.com/index/clip#citation-bottom-30)

## Key takeaways

**1. CLIP is highly efficient**

CLIP learns from unfiltered, highly varied, and highly noisy data, and is intended to be used in a zero-shot manner. We know from GPT‑2 and 3 that models trained on such data can achieve compelling zero shot performance; however, such models require significant training compute. To reduce the needed compute, we focused on algorithmic ways to improve the training efficiency of our approach.

We report two algorithmic choices that led to significant compute savings. The first choice is the adoption of a contrastive objective for connecting text with images.[31](https://openai.com/index/clip#citation-bottom-31), [17](https://openai.com/index/clip#citation-bottom-17), [35](https://openai.com/index/clip#citation-bottom-35)We originally explored an image-to-text approach, similar to VirTex,[33](https://openai.com/index/clip#citation-bottom-33)but encountered difficulties scaling this to achieve state-of-the-art performance. In small to medium scale experiments, we found that the contrastive objective used by CLIP is 4x to 10x more efficient at zero-shot ImageNet classification. The second choice was the adoption of the Vision Transformer,[36](https://openai.com/index/clip#citation-bottom-36)which gave us a further 3x gain in compute efficiency over a standard ResNet. In the end, our best performing CLIP model trains on 256 GPUs for 2 weeks which is similar to existing large scale image models.[37](https://openai.com/index/clip#citation-bottom-37), [23](https://openai.com/index/clip#citation-bottom-23), [38](https://openai.com/index/clip#citation-bottom-38), [36](https://openai.com/index/clip#citation-bottom-36)

We originally explored training image-to-caption language models but found this approach struggled at zero-shot transfer. In this 16 GPU day experiment, a language model only achieves 16% accuracy on ImageNet after training for 400 million images. CLIP is much more efficient and achieves the same accuracy roughly 10x faster.

**2. CLIP is flexible and general**

Because they learn a wide range of visual concepts directly from natural language, CLIP models are significantly more flexible and general than existing ImageNet models. We find they are able to zero-shot perform many different tasks. To validate this we have measured CLIP’s zero-shot performance on over 30 different datasets including tasks such as fine-grained object classification, geo-localization, action recognition in videos, and OCR.[B](https://openai.com/index/clip#citation-bottom-B) In particular, learning OCR is an example of an exciting behavior that does not occur in standard ImageNet models. Above, we visualize a random non-cherry picked prediction from each zero-shot classifier.

This finding is also reflected on a standard representation learning evaluation using linear probes. The best CLIP model outperforms the best publicly available ImageNet model, the Noisy Student EfficientNet-L2,[23](https://openai.com/index/clip#citation-bottom-23)on 20 out of 26 different transfer datasets we tested.

CLIP-ViT

Instagram

ViT (ImageNet-21k)

CLIP-ResNet

SimCLRv2

BiT-M

EfficientNet-NoisyStudent

BYOL

BiT-S

EfficientNet

MoCo

ResNet

Across a suite of 27 datasets measuring tasks such as fine-grained object classification, OCR, activity recognition in videos, and geo-localization, we find that CLIP models learn more widely useful image representations. CLIP models are also more compute efficient than the models from 10 prior approaches that we compare with. 

## Limitations

While CLIP usually performs well on recognizing common objects, it struggles on more abstract or systematic tasks such as counting the number of objects in an image and on more complex tasks such as predicting how close the nearest car is in a photo. On these two datasets, zero-shot CLIP is only slightly better than random guessing. Zero-shot CLIP also struggles compared to task specific models on very fine-grained classification, such as telling the difference between car models, variants of aircraft, or flower species.

CLIP also still has poor generalization to images not covered in its pre-training dataset. For instance, although CLIP learns a capable OCR system, when evaluated on handwritten digits from the MNIST dataset, zero-shot CLIP only achieves 88% accuracy, well below the 99.75% of humans on the dataset. Finally, we’ve observed that CLIP’s zero-shot classifiers can be sensitive to wording or phrasing and sometimes require trial and error “prompt engineering” to perform well.

## Broader impacts

CLIP allows people to design their own classifiers and removes the need for task-specific training data. The manner in which these classes are designed can heavily influence both model performance and model biases. For example, we find that when given a set of labels including Fairface[39](https://openai.com/index/clip#citation-bottom-39)race labels[C](https://openai.com/index/clip#citation-bottom-C) and a handful of egregious terms such as “criminal”, “animal,” etc., the model tends to classify images of people aged 0–20 in the egregious category at a rate of ~32.3%. However, when we add the class “child” to the list of possible classes, this behaviour drops to~8.7%.

Additionally, given that CLIP does not need task-specific training data it can unlock certain niche tasks with greater ease. Some of these tasks may raise privacy or surveillance related risks and we explore this concern by studying the performance of CLIP on celebrity identification. CLIP has a top-1 accuracy of 59.2% for “in the wild” celebrity image classification when choosing from 100 candidates and a top-1 accuracy of 43.3% when choosing from 1000 possible choices. Although it’s noteworthy to achieve these results with task agnostic pre-training, this performance is not competitive when compared to widely available production level models. We further explore challenges that CLIP poses in our[paper⁠(opens in a new window)](https://arxiv.org/abs/2103.00020)and we hope that this work motivates future research on the characterization of the capabilities, shortcomings, and biases of such models. We are excited to engage with the research community on such questions.

## Conclusion

With CLIP, we’ve tested whether task agnostic pre-training on internet scale natural language, which has powered a recent breakthrough in NLP, can also be leveraged to improve the performance of deep learning for other fields. We are excited by the results we’ve seen so far applying this approach to computer vision. Like the GPT family, CLIP learns a wide variety of tasks during pre-training which we demonstrate via zero-shot transfer. We are also encouraged by our findings on ImageNet that suggest zero-shot evaluation is a more representative measure of a model’s capability.

*   [CLIP](https://openai.com/research/index/?tags=technology-clip)
*   [Generative Models](https://openai.com/research/index/?tags=generative-models)
*   [Language](https://openai.com/research/index/?tags=language)
*   [Transformers](https://openai.com/research/index/?tags=transformers)

## Footnotes

1.   29 In 2015, a group of researchers from Microsoft first trained a model which achieved a top-5 accuracy on ImageNet that surpassed reported human top-5 accuracy. 
2.   B While CLIP’s zero-shot OCR performance is mixed, its semantic OCR representation is quite useful. When evaluated on the SST-2 NLP dataset rendered as images, a linear classifer on CLIP’s representation matches a CBoW model with direct access to the text. CLIP is also competitive at detecting hateful memes without needing ground truth text. 
3.   40 FairFace is a face image dataset designed to balance age, gender, and race, in order to reduce asymmetries common in previous face datasets. It categorizes gender into 2 groups: female and male and race into 7 groups: White, Black, Indian, East Asian, Southeast Asian, Middle Eastern, and Latino. There are inherent problems with race and gender classifications, as e.g. Bowker and Star (2000)and Keyes (2018)have shown. While FairFace’s dataset reduces the proportion of White faces, it still lacks representation of entire large demographic groups, effectively erasing such categories. We use the 2 gender categories and 7 race categories defined in the FairFace dataset in a number of our experiments not in order to reinforce or endorse the use of such reductive categories, but in order to enable us to make comparisons to prior work. 

## References

1.   1 Dodge, S., & Karam, L. (2017, July). “[A study and comparison of human and deep learning recognition performance under visual distortions.⁠(opens in a new window)](https://arxiv.org/abs/1705.02498)” In ICCCN 2017. 
2.   2 Geirhos, R., Rubisch, P., Michaelis, C., Bethge, M., Wichmann, F. A., & Brendel, W. (2018). “[ImageNet-trained CNNs are biased towards texture; increasing shape bias improves accuracy and robustness.⁠(opens in a new window)](https://openreview.net/pdf?id=Bygh9j09KX)” In ICLR 2019. 
3.   3 Alcorn, M. A., Li, Q., Gong, Z., Wang, C., Mai, L., Ku, W. S., & Nguyen, A. (2019). “[Strike (with) a pose: Neural networks are easily fooled by strange poses of familiar objects.⁠(opens in a new window)](https://openaccess.thecvf.com/content_CVPR_2019/papers/Alcorn_Strike_With_a_Pose_Neural_Networks_Are_Easily_Fooled_by_CVPR_2019_paper.pdf)” In CVPR 2019. 
4.   4 Barbu, A., Mayo, D., Alverio, J., Luo, W., Wang, C., Gutfreund, D., ... & Katz, B. (2019). “[Objectnet: A large-scale bias-controlled dataset for pushing the limits of object recognition models.⁠(opens in a new window)](https://papers.nips.cc/paper/2019/file/97af07a14cacba681feacf3012730892-Paper.pdf)” In NeurIPS 2019. 
5.   5 Radford, A., Wu, J., Child, R., Luan, D., Amodei, D., & Sutskever, I. (2019). “[Language Models are Unsupervised Multitask Learners.⁠(opens in a new window)](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)” Technical Report,OpenAI. 
6.   6 Brown, T. B., Mann, B., Ryder, N., Subbiah, M., Kaplan, J., Dhariwal, P., ... & Agarwal, S. (2020). “[Language Models are Few-Shot Learners.⁠(opens in a new window)](https://papers.nips.cc/paper/2020/file/1457c0d6bfcb4967418bfb8ac142f64a-Paper.pdf)” In NeurIPS 2020. 
7.   7 He, K., Zhang, X., Ren, S., & Sun, J. (2016). “[Deep residual learning for image recognition.⁠(opens in a new window)](https://openaccess.thecvf.com/content_cvpr_2016/papers/He_Deep_Residual_Learning_CVPR_2016_paper.pdf)” In CVPR 2016. 
8.   8 Larochelle, H., Erhan, D., & Bengio, Y. (2008, July). “[Zero-data learning of new tasks.⁠(opens in a new window)](https://www.aaai.org/Papers/AAAI/2008/AAAI08-103.pdf)” In AAAI 2008. 
9.   9 Lampert, C. H., Nickisch, H., & Harmeling, S. (2009, June). “[Learning to detect unseen object classes by between-class attribute transfer.⁠(opens in a new window)](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.165.9750&rep=rep1&type=pdf)” In CVPR 2009. 
10.   10 Lei Ba, J., Swersky, K., & Fidler, S. (2015). “[Predicting deep zero-shot convolutional neural networks using textual descriptions.⁠(opens in a new window)](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.165.9750&rep=rep1&type=pdf)” In ICCV 2015. 
11.   11 Socher, R., Ganjoo, M., Manning, C. D., & Ng, A. (2013). “[Zero-shot learning through cross-modal transfer.⁠(opens in a new window)](https://papers.nips.cc/paper/2013/file/2d6cc4b2d139a53512fb8cbb3086ae2e-Paper.pdf)” In NeurIPS 2013. 
12.   12 Frome, A., Corrado, G. S., Shlens, J., Bengio, S., Dean, J., Ranzato, M. A., & Mikolov, T. (2013). “[Devise: A deep visual-semantic embedding model.⁠(opens in a new window)](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/41473.pdf)” In NeurIPS 2013. 
13.   13 Li, A., Jabri, A., Joulin, A., & van der Maaten, L. (2017). “[Learning visual n-grams from web data.⁠(opens in a new window)](https://openaccess.thecvf.com/content_ICCV_2017/papers/Li_Learning_Visual_N-Grams_ICCV_2017_paper.pdf)” In Proceedings of the IEEE International Conference on Computer Vision 2017. 
14.   14 Doersch, C., Gupta, A., & Efros, A. A. (2015). “[Unsupervised visual representation learning by context prediction.⁠(opens in a new window)](https://www.cv-foundation.org/openaccess/content_iccv_2015/papers/Doersch_Unsupervised_Visual_Representation_ICCV_2015_paper.pdf)” In ICCV 2015. 
15.   15 Zhai, X., Oliver, A., Kolesnikov, A., & Beyer, L. (2019). “[S4l: Self-supervised semi-supervised learning.⁠(opens in a new window)](https://papers.nips.cc/paper/2020/file/f3ada80d5c4ee70142b17b8192b2958e-Paper.pdf)” In ICCV 2019. 
16.   16 Grill, J. B., Strub, F., Altché, F., Tallec, C., Richemond, P. H., Buchatskaya, E., ... & Piot, B. (2020). “[Bootstrap your own latent: A new approach to self-supervised learning.⁠(opens in a new window)](https://papers.nips.cc/paper/2020/file/f3ada80d5c4ee70142b17b8192b2958e-Paper.pdf)” In NeurIPS 2020. 
17.   17 Oord, A. V. D., Li, Y., & Vinyals, O. (2018). “[Representation Learning with Contrastive Predictive Coding.⁠(opens in a new window)](https://arxiv.org/abs/1807.03748)” arXiv preprint. 
18.   18 Hjelm, R. D., Fedorov, A., Lavoie-Marchildon, S., Grewal, K., Bachman, P., Trischler, A., & Bengio, Y. (2018). “[Learning deep representations by mutual information estimation and maximization.⁠(opens in a new window)](https://openreview.net/pdf?id=Bklr3j0cKX)” In ICLR 2019. 
19.   19 Bachman, P., Hjelm, R. D., & Buchwalter, W. (2019). “[Learning representations by maximizing mutual information across views.⁠(opens in a new window)](https://papers.nips.cc/paper/2019/file/ddf354219aac374f1d40b7e760ee5bb7-Paper.pdf)” In NeurIPS 2019. 
20.   20 He, K., Fan, H., Wu, Y., Xie, S., & Girshick, R. (2020). “[Momentum contrast for unsupervised visual representation learning.⁠(opens in a new window)](https://openaccess.thecvf.com/content_CVPR_2020/papers/He_Momentum_Contrast_for_Unsupervised_Visual_Representation_Learning_CVPR_2020_paper.pdf)” In CVPR 2020. 
21.   21 Chen, T., Kornblith, S., Norouzi, M., & Hinton, G. (2020). “[A simple framework for contrastive learning of visual representations.⁠(opens in a new window)](https://arxiv.org/abs/2002.05709)” arXiv preprint. 
22.   22 Lee, D. H. (2013, June). “[Pseudo-label: The simple and efficient semi-supervised learning method for deep neural networks.⁠(opens in a new window)](https://www.kaggle.com/blobs/download/forum-message-attachment-files/746/pseudo_label_final.pdf)” In Workshop on challenges in representation learning, ICML(2013). 
23.   23 Xie, Q., Luong, M. T., Hovy, E., & Le, Q. V. (2020). “[Self-training with noisy student improves imagenet classification.⁠(opens in a new window)](https://openaccess.thecvf.com/content_CVPR_2020/papers/Xie_Self-Training_With_Noisy_Student_Improves_ImageNet_Classification_CVPR_2020_paper.pdf)” In CVPR 2020. 
24.   24 Kingma, D. P., Mohamed, S., Jimenez Rezende, D., & Welling, M. (2014). “[Semi-supervised learning with deep generative models.⁠(opens in a new window)](https://papers.nips.cc/paper/2019/file/18cdf49ea54eec029238fcc95f76ce41-Paper.pdf)” In NeurIPS 2014. 
25.   25 Salimans, T., Goodfellow, I., Zaremba, W., Cheung, V., Radford, A., & Chen, X. (2016). “[Improved techniques for training gans.⁠(opens in a new window)](https://papers.nips.cc/paper/2016/file/8a3363abe792db2d8761d6403605aeb7-Paper.pdf)” In NeurIPS 2016. 
26.   26 Donahue, J., & Simonyan, K. (2019). “[Large scale adversarial representation learning.⁠(opens in a new window)](https://papers.nips.cc/paper/2019/file/18cdf49ea54eec029238fcc95f76ce41-Paper.pdf)” In NeurIPS 2019. 
27.   27 Chen, M., Radford, A., Child, R., Wu, J., Jun, H., Luan, D., & Sutskever, I. (2020, November). “[Generative pretraining from pixels.⁠(opens in a new window)](https://cdn.openai.com/papers/Generative_Pretraining_from_Pixels_V2.pdf)” In ICML 2020. 
28.   28 He, K., Zhang, X., Ren, S., & Sun, J. (2015). “[Delving Deep into Rectifiers: Surpassing Human-Level Performance on ImageNet Classification.⁠(opens in a new window)](https://www.cv-foundation.org/openaccess/content_iccv_2015/papers/He_Delving_Deep_into_ICCV_2015_paper.pdf)” In ICCV 2015. 
29.   29 Russakovsky, O., Deng, J., Su, H., Krause, J., Satheesh, S., Ma, S., ... & Berg, A. C. (2015). “[Imagenet large scale visual recognition challenge.⁠(opens in a new window)](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.693.9561&rep=rep1&type=pdf)” In IJCV 2015. 
30.   30 Taori, R., Dave, A., Shankar, V., Carlini, N., Recht, B., & Schmidt, L. (2020). “[Measuring robustness to natural distribution shifts in image classification.⁠(opens in a new window)](https://proceedings.neurips.cc/paper/2020/file/d8330f857a17c53d217014ee776bfd50-Paper.pdf)” In NeurIPS 2020. 
31.   31 Sohn, K. (2016). “[Improved deep metric learning with multi-class n-pair loss objective.⁠(opens in a new window)](https://papers.nips.cc/paper/2016/file/8bdb5058376143fa358981954e7626b8-Paper.pdf)” In NeurIPS 2016. 
32.   32 Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). “[Attention is all you need.⁠(opens in a new window)](https://arxiv.org/abs/2006.06666)” In NeurIPS 2017. 
33.   33 Desai, K., & Johnson, J. (2020). “[VirTex: Learning Visual Representations from Textual Annotations.⁠(opens in a new window)](https://arxiv.org/abs/2006.06666)” arXiv preprint. 
34.   34 Sariyildiz, M. B., Perez, J., & Larlus, D. (2020). “[Learning Visual Representations with Caption Annotations.⁠(opens in a new window)](http://www.ecva.net/papers/eccv_2020/papers_ECCV/papers/123530154.pdf)” In ECCV 2020. 
35.   35 Zhang, Y., Jiang, H., Miura, Y., Manning, C. D., & Langlotz, C. P. (2020). “[Contrastive Learning of Medical Visual Representations from Paired Images and Text.⁠(opens in a new window)](https://arxiv.org/abs/2010.00747)” arXiv preprint. 
36.   36 Dosovitskiy, A., Beyer, L., Kolesnikov, A., Weissenborn, D., Zhai, X., Unterthiner, T., ... & Uszkoreit, J. (2020). “[An image is worth 16x16 words: Transformers for image recognition at scale.⁠(opens in a new window)](https://arxiv.org/abs/2010.11929)” arXiv preprint. 
37.   37 Mahajan, D., Girshick, R., Ramanathan, V., He, K., Paluri, M., Li, Y., ... & van der Maaten, L. (2018). “[Exploring the limits of weakly supervised pretraining.⁠(opens in a new window)](https://openaccess.thecvf.com/content_ECCV_2018/papers/Dhruv_Mahajan_Exploring_the_Limits_ECCV_2018_paper.pdf)” In ECCV 2018. 
38.   38 Kolesnikov, A., Beyer, L., Zhai, X., Puigcerver, J., Yung, J., Gelly, S., & Houlsby, N. (2019). “[Big Transfer (BiT): General Visual Representation Learning.⁠(opens in a new window)](https://arxiv.org/abs/1912.11370)” arXiv preprint. 
39.   39 Kärkkäinen, K., & Joo, J. (2019). “[Fairface: Face attribute dataset for balanced race, gender, and age.⁠(opens in a new window)](https://arxiv.org/abs/1908.04913)” arXiv preprint. 
40.   40 Bowker, G., & Star, S. L. (1999). “[Sorting things out. Classification and its consequences⁠(opens in a new window)](https://mitpress.mit.edu/books/sorting-things-out)”Book. 
41.   41 Keyes, O. (2018). “[The misgendering machines: Trans/HCI implications of automatic gender recognition.⁠(opens in a new window)](https://dl.acm.org/doi/10.1145/3274357)” In Proceedings of the ACM on Human-Computer Interaction. 

## Authors

Alec Radford, Ilya Sutskever, Jong Wook Kim, Gretchen Krueger, Sandhini Agarwal

## Acknowledgments

We’d like to thank the millions of people involved in creating the data CLIP is trained on. We also are grateful to all our co-authors for their contributions to the project. Finally, we’d like to thank Jeff Clune, Miles Brundage, Ryan Lowe, Jakub Pachocki, and Vedant Misra for feedback on drafts of this blog and Matthew Knight for reviewing the code release.

## Design & Cover Artwork

Justin Jay Wang

## Related articles

[View all](https://openai.com/news/)

![Image 10: Point E A System For Generating 3d Point Clouds From Complex Prompts](https://images.ctfassets.net/kftzwdyauwt9/7e4ba260-7655-4049-5a2568c94158/2f2af956a356ee2b507296d01e45e766/image-5.webp?w=3840&q=90&fm=webp)

[Point-E: A system for generating 3D point clouds from complex prompts Publication Dec 16, 2022](https://openai.com/index/point-e/)

![Image 11: Screenshot of a scene from Minecraft](https://images.ctfassets.net/kftzwdyauwt9/ef9fc360-1a5a-4ca3-5c25b83b3564/50c07940455cc86ef84d91526d9cf3e0/vpt.jpg?w=3840&q=90&fm=webp)

[Learning to play Minecraft with Video PreTraining Conclusion Jun 23, 2022](https://openai.com/index/vpt/)

![Image 12: Hierarchical Text Conditional Image Generation With Clip Latents](https://images.ctfassets.net/kftzwdyauwt9/7c44eedc-3563-4438-c613706c52b1/fcfc38b26fd4878a3c6b4ca8d1d73b17/hierarchical-text-conditional-image-generation-with-clip-latents.jpg?w=3840&q=90&fm=webp)

[Hierarchical text-conditional image generation with CLIP latents Publication Apr 13, 2022](https://openai.com/index/hierarchical-text-conditional-image-generation-with-clip-latents/)

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
*   [ChatGPT(opens in a new window)](https://chatgpt.com/?openaicom-did=f190f099-f6d9-45d0-84f6-5fd6bb7509ec&openaicom_referred=true)
*   [ChatGPT Business(opens in a new window)](https://chatgpt.com/business/?openaicom-did=f190f099-f6d9-45d0-84f6-5fd6bb7509ec&openaicom_referred=true)
*   [ChatGPT Enterprise(opens in a new window)](https://chatgpt.com/business/enterprise/?openaicom-did=f190f099-f6d9-45d0-84f6-5fd6bb7509ec&openaicom_referred=true)
*   [ChatGPT for Education(opens in a new window)](https://chatgpt.com/business/education/?openaicom-did=f190f099-f6d9-45d0-84f6-5fd6bb7509ec&openaicom_referred=true)
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

![Image 13](https://bat.bing.com/action/0?ti=187204252&Ver=2&mid=3989c1f7-f6d1-4258-9b34-705e812057f1&bo=1&sid=a63f5ee079be11f1bca5a96e0f1fcabf&vid=a63f7a0079be11f18041e30d7830e426&vids=1&msclkid=N&pi=918639831&lg=en-US&sw=1280&sh=1280&sc=24&tl=CLIP%3A%20Connecting%20text%20and%20images%20%7C%20OpenAI&p=https%3A%2F%2Fopenai.com%2Findex%2Fclip%2F&r=&lt=1089&evt=pageLoad&sv=2&cdb=AQAQ&rn=472787)
