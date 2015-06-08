---
title: Coursera Statistical Inference Project Part 1
layout: post
tags: [statistical inference, coursera, moocs, statistics]
author_name: Kevin Bello
author_uri: http://twitter.com/kbellomedina
categories: [postk]
---

The following is the report I presented for the first part of the course project for the [Coursera Statistical Inference course][link1].

[link1]: https://www.coursera.org/course/statinference

**Overview**

The exponential distribution can be simulated in R with `rexp(n, lambda)` where `lambda` \\(\lambda\\) is the rate parameter. The mean of the exponential distribution is  \\(1/\lambda\\) and the standard deviation is also \\(1/\lambda\\). For this simulation, we set \\(\lambda=0.2\\). And we investigate the distribution of averages of 40 samples drawn from the exponential distribution with \\(\lambda=0.2\\).

**Simulations**

Let's calculate a thousand times the average of 40 samples drawn from the exponential distribution.


{% highlight r linenos %}
# set the values for simulation
set.seed(234)
nosim <- 1000
n <- 40
lambda <- 0.2
# create a 1000-row matrix in which each row consists of
# 40 samples drawn from the exp distribution
simdata <- matrix(rexp(nosim * n, rate = lambda), nosim)
# take the mean for each row
row_means <- rowMeans(simdata)
{% endhighlight %}

Now we have a thousand of numbers in `row_means` each of which represents the average of 40 samples.

<!--more-->

**1. Sample Mean versus Theoretical Mean**

Let's compare the theoretical mean \\(1/\lambda\\) with the sample mean `mean(row_means)`.


{% highlight r linenos %}
tmean <- 1/lambda
print(paste("Theoretical mean: ", tmean));
{% endhighlight %}


{% highlight text linenos %}
## [1] "Theoretical mean:  5"
{% endhighlight %}


{% highlight r linenos %}
print(paste("Sample mean: ", round(mean(row_means), 3)));
{% endhighlight %}

{% highlight text linenos %}
## [1] "Sample mean:  5.002"
{% endhighlight %}

As we can observe, the distribution of sample means is centered at \\(5.002\\) and the theoretical center of the distribution is \\(\lambda^{-1} = 5\\). Thus giving a close estimate of the population mean.

**2. Sample Variance versus Theoretical Variance**

Let's compare the theoretical variance \\(1/\lambda^{2}\\) with the sample variance `var(row_means)` and the theoretical standard error \\(1/(\lambda*\sqrt{n})\\) with the sample standard error `sd(row_means)`.


{% highlight r linenos %}
tvar <- (1/lambda)^2/n;
tsd <- 1/(lambda*sqrt(n));
print (paste("Theoretical variance: ", tvar));
{% endhighlight %}

{% highlight text linenos %}
## [1] "Theoretical variance:  0.625"
{% endhighlight %}

{% highlight r linenos %}
print (paste("Sample variance: ", round(var(row_means), 3)));
{% endhighlight %}

{% highlight text linenos %}
## [1] "Sample variance:  0.663"
{% endhighlight %}

{% highlight r linenos %}
print (paste("Theoretical standard error: ", round(tsd, 3)));
{% endhighlight %}

{% highlight text linenos %}
## [1] "Theoretical standard error:  0.791"
{% endhighlight %}

{% highlight r linenos %}
print (paste("Sample standard error: ", round(sd(row_means), 3)));
{% endhighlight %}

{% highlight text linenos %}
## [1] "Sample standard error:  0.814"
{% endhighlight %}

The variance of sample means is \\(0.663\\) and the theoretical variance of the distribution is \\(0.625\\), again pretty close numbers. The same can be said of the standard error values.

**3. Distribution is approximately normal**

By the central limit theorem we know that the averages of samples will follow a normal distribution. The figure below shows the density computed using the histogram and the normal density plotted with theoretical mean and variance values. Both graphics are similar which suggest the normality.

<img src="{{ site.url }}/images/statinference1-unnamed-chunk-4-1.png" title="Fig1" alt="Fig1" style="display: block; margin: auto;" />
