Title: Multimodal neurons in artificial neural networks

URL Source: https://openai.com/index/multimodal-neurons

Markdown Content:
Table of contents

We’ve discovered neurons in CLIP that respond to the same concept whether presented literally, symbolically, or conceptually. This may explain CLIP’s accuracy in classifying surprising visual renditions of concepts, and is also an important step toward understanding the associations and biases that CLIP and similar models learn.

Fifteen years ago, Quiroga et al.[1](https://openai.com/index/multimodal-neurons#citation-bottom-1)discovered that the human brain possesses multimodal neurons. These neurons respond to clusters of abstract concepts centered around a common high-level theme, rather than any specific visual feature. The most famous of these was the “Halle Berry” neuron, a neuron featured in both[Scientific American⁠(opens in a new window)](https://www.scientificamerican.com/article/one-face-one-neuron)and[The New York Times⁠(opens in a new window)](https://www.nytimes.com/2005/07/05/science/a-neuron-with-halle-berrys-name-on-it.html), that responds to photographs, sketches, and the text “Halle Berry” (but not other names).

Two months ago, OpenAI announced[CLIP⁠](https://openai.com/index/clip/), a general-purpose vision system that matches the performance of a ResNet-50,[2](https://openai.com/index/multimodal-neurons#citation-bottom-2)but outperforms existing vision systems on some of the most challenging datasets. Each of these challenge datasets,_ObjectNet_,_ImageNet Rendition_, and _ImageNet Sketch_, stress tests the model’s robustness to not recognizing not just simple distortions or changes in lighting or pose, but also to complete abstraction and reconstruction—sketches, cartoons, and even statues of the objects.

Now, we’re releasing our discovery of the presence of multimodal neurons in CLIP. One such neuron, for example, is a “Spider-Man” neuron (bearing a remarkable resemblance to the “Halle Berry” neuron) that responds to an image of a spider, an image of the text “spider,” and the comic book character “Spider-Man” either in costume or illustrated.

Our discovery of multimodal neurons in CLIP gives us a clue as to what may be a common mechanism of both synthetic and natural vision systems—abstraction. We discover that the highest layers of CLIP organize images as a loose semantic collection of ideas, providing a simple explanation for both the model’s versatility and the representation’s compactness.

Using the tools of interpretability, we give an unprecedented look into the rich visual concepts that exist within the weights of CLIP. Within CLIP, we discover high-level concepts that span a large subset of the human visual lexicon—geographical regions, facial expressions, religious iconography, famous people and more. By probing what each neuron affects downstream, we can get a glimpse into how CLIP performs its classification.

## Multimodal neurons in CLIP

Our[paper⁠(opens in a new window)](https://distill.pub/2021/multimodal-neurons/)builds on nearly a decade of research into interpreting convolutional networks,[3](https://openai.com/index/multimodal-neurons#citation-bottom-3), [4](https://openai.com/index/multimodal-neurons#citation-bottom-4), [5](https://openai.com/index/multimodal-neurons#citation-bottom-5), [6](https://openai.com/index/multimodal-neurons#citation-bottom-6), [7](https://openai.com/index/multimodal-neurons#citation-bottom-7), [8](https://openai.com/index/multimodal-neurons#citation-bottom-8), [9](https://openai.com/index/multimodal-neurons#citation-bottom-9), [10](https://openai.com/index/multimodal-neurons#citation-bottom-10), [11](https://openai.com/index/multimodal-neurons#citation-bottom-11), [12](https://openai.com/index/multimodal-neurons#citation-bottom-12)beginning with the observation that many of these classical techniques are directly applicable to CLIP. We employ two tools to understand the activations of the model:_feature visualization_,[6](https://openai.com/index/multimodal-neurons#citation-bottom-6), [5](https://openai.com/index/multimodal-neurons#citation-bottom-5), [12](https://openai.com/index/multimodal-neurons#citation-bottom-12)which maximizes the neuron’s firing by doing gradient-based optimization on the input, and _dataset examples_,[4](https://openai.com/index/multimodal-neurons#citation-bottom-4)which looks at the distribution of maximal activating images for a neuron from a dataset.

Using these simple techniques, we’ve found the majority of the neurons in CLIP RN50x4 (a ResNet-50 scaled up 4x using the EfficientNet scaling rule) to be readily interpretable. Indeed, these neurons appear to be extreme examples of “multi-faceted neurons,”[11](https://openai.com/index/multimodal-neurons#citation-bottom-11)neurons that respond to multiple distinct cases, only at a higher level of abstraction.

Indeed, we were surprised to find many of these categories appear to mirror neurons in the medial temporal lobe documented in epilepsy patients with intracranial depth electrodes. These include neurons that respond to emotions,[17](https://openai.com/index/multimodal-neurons#citation-bottom-17)animals,[18](https://openai.com/index/multimodal-neurons#citation-bottom-18)and famous people.[1](https://openai.com/index/multimodal-neurons#citation-bottom-1)

But our investigation into CLIP reveals many more such strange and wonderful abstractions, including neurons that appear to count [[17⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_4x/image_block_4_5_Add_6_0/17),[202⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_4x/image_block_4_5_Add_6_0/202),[310⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_4x/image_block_4_5_Add_6_0/310)], neurons responding to art styles [[75⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_4x/image_block_4_5_Add_6_0/75),[587⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_4x/image_block_4_5_Add_6_0/587),[122⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_4x/image_block_4_5_Add_6_0/122)], even images with evidence of digital alteration [[1640⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_4x/image_block_4_5_Add_6_0/1640)].

## Absent concepts

While this analysis shows a great breadth of concepts, we note that a simple analysis on a neuron level cannot represent a complete documentation of the model’s behavior. The authors of CLIP have demonstrated, for example, that the model is capable of very precise geolocation,[19](https://openai.com/index/multimodal-neurons#citation-bottom-19)(Appendix E.4, Figure 20) with a granularity that extends down to the level of a city and even a neighborhood. In fact, we offer an anecdote: we have noticed, by running our own personal photos through CLIP, that CLIP can often recognize if a photo was taken in San Francisco, and sometimes even the neighborhood (e.g., “Twin Peaks”).

Despite our best efforts, however, we have not found a “San Francisco” neuron, nor did it seem from attribution that San Francisco decomposes nicely into meaningful unit concepts like “California” and “city.” We believe this information to be encoded within the activations of the model somewhere, but in a more exotic way, either as a direction or as some other more complex manifold. We believe this to be a fruitful direction for further research.

## How multimodal neurons compose

These multimodal neurons can give us insight into understanding how CLIP performs classification. With a sparse linear probe,[19](https://openai.com/index/multimodal-neurons#citation-bottom-19)we can easily inspect CLIP’s weights to see which concepts combine to achieve a final classification for ImageNet classification:

For text classification, a key observation is that these concepts are contained within neurons in a way that, similar to the word2vec objective,[20](https://openai.com/index/multimodal-neurons#citation-bottom-20)is _almost linear_. The concepts, therefore, form a simple algebra that behaves similarly to a linear probe. By linearizing the attention, we too can inspect any sentence, much like a linear probe, as shown below:

## Fallacies of abstraction

The degree of abstraction in CLIP surfaces a new vector of attack that we believe has not manifested in previous systems. Like many deep networks, the representations at the highest layers of the model are completely dominated by such high-level abstractions. What distinguishes CLIP, however, is a matter of degree—CLIP’s multimodal neurons generalize across the literal and the iconic, which may be a double-edged sword.

Through a series of carefully-constructed experiments, we demonstrate that we can exploit this reductive behavior to fool the model into making absurd classifications. We have observed that the excitations of the neurons in CLIP are often controllable by its response to _images of text_, providing a simple vector of attacking the model.

The finance neuron [[1330⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_4x/image_block_4_5_Add_6_0/1330)], for example, responds to images of piggy banks, but also responds to the string“$$$”. By forcing the finance neuron to fire, we can fool our model into classifying a dog as a piggy bank.

## Attacks in the wild

We refer to these attacks as _typographic attacks_. We believe attacks such as those described above are far from simply an academic concern. By exploiting the model’s ability to read text robustly, we find that even _photographs of hand-written text_ can often fool the model. Like the Adversarial Patch,[21](https://openai.com/index/multimodal-neurons#citation-bottom-21)this attack works in the wild; but unlike such attacks, it requires no more technology than pen and paper.

We also believe that these attacks may also take a more subtle, less conspicuous form. An image, given to CLIP, is abstracted in many subtle and sophisticated ways, and these abstractions may over-abstract common patterns—oversimplifying and, by virtue of that,overgeneralizing.

## Bias and overgeneralization

Our model, despite being trained on a curated subset of the internet, still inherits its many unchecked biases and associations. Many associations we have discovered appear to be benign, but yet we have discovered several cases where CLIP holds associations that could result in representational harm, such as denigration of certain individuals or groups.

We have observed, for example, a “Middle East” neuron[[1895]⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_v2/image_block_4_2_Add_6_0/1895)with an association with terrorism; and an “immigration” neuron[[395]⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_v2/image_block_4_2_Add_6_0/395)that responds to Latin America. We have even found a neuron that fires for both dark-skinned people and gorillas [[1257⁠(opens in a new window)](https://microscope.openai.com/models/contrastive_4x/image_block_4_5_Add_6_0/1257)], mirroring earlier photo tagging incidents in other models we consider unacceptable.[22](https://openai.com/index/multimodal-neurons#citation-bottom-22)

These associations present obvious challenges to applications of such powerful visual systems.[A](https://openai.com/index/multimodal-neurons#citation-bottom-A) Whether fine-tuned or used zero-shot, it is likely that these biases and associations will remain in the system, with their effects manifesting in both visible and nearly invisible ways during deployment. Many biased behaviors may be difficult to anticipate a priori, making their measurement and correction difficult. We believe that these tools of interpretability may aid practitioners the ability to preempt potential problems, by discovering some of these associations and ambigiuities ahead of time.

Our own understanding of CLIP is still evolving, and we are still determining if and how we would release large versions of CLIP. We hope that further community exploration of the released versions as well as the tools we are announcing today will help advance general understanding of multimodal systems, as well as inform our own decision-making.

## Conclusion

Alongside the publication of “Multimodal Neurons in Artificial Neural Networks,” we are also releasing some of the tools we have ourselves used to understand CLIP—the OpenAI[Microscope⁠(opens in a new window)](https://microscope.openai.com/)catalog has been updated with feature visualizations, dataset examples, and text feature visualizations for every neuron in CLIP RN50x4. We are also releasing the weights of CLIP [RN50x4⁠(opens in a new window)](https://github.com/openai/CLIP) and [RN101⁠(opens in a new window)](https://github.com/openai/CLIP)to further accommodate such research. We believe these investigations of CLIP only scratch the surface in understanding CLIP’s behavior, and we invite the research community to join in improving our understanding of CLIP and models like it.

*   [CLIP](https://openai.com/research/index/?tags=technology-clip)
*   [Generative Models](https://openai.com/research/index/?tags=generative-models)
*   [Transformers](https://openai.com/research/index/?tags=transformers)
*   [Language](https://openai.com/research/index/?tags=language)
*   [Ethics & Safety](https://openai.com/research/index/?tags=ethics-safety)

## Footnotes

1.   A

## References

1.   1 Quiroga, R. Q., Reddy, L., Kreiman, G., Koch, C., & Fried, I. (2005).[Invariant visual representation by single neurons in the human brain⁠(opens in a new window)](https://www.nature.com/articles/nature03687)._Nature, 435_(7045),1102-1107. 
2.   2
3.   3
4.   4 Szegedy, C., Zaremba, W., Sutskever, I., Bruna, J., Erhan, D., Goodfellow, I., & Fergus, R. (2013).[Intriguing properties of neural networks⁠(opens in a new window)](https://arxiv.org/abs/1312.6199)._arXiv preprint arXiv:1312.6199_. 
5.   5
6.   6
7.   7
8.   8
9.   9
10.   10
11.   11
12.   12
13.   13
14.   14
15.   15
16.   16
17.   17
18.   18
19.   19
20.   20
21.   21
22.   22

## Authors

Gabriel Goh, Chelsea Voss, Daniela Amodei, Shan Carter, Michael Petrov, Justin Jay Wang, Nick Cammarata, Chris Olah

## Acknowledgments

Sandhini Agarwal, Greg Brockman, Miles Brundage, Jeff Clune, Steve Dowling, Jonathan Gordon, Gretchen Krueger, Faiz Mandviwalla, Vedant Misra, Reiichiro Nakano, Ashley Pilipiszyn, Alec Radford, Aditya Ramesh, Pranav Shyam, Ilya Sutskever, Martin Wattenberg & Hannah Wong
