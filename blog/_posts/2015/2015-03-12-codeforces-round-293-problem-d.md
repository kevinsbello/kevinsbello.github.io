---
title: Codeforces Round 293 - Problem D
author_uri: "http://twitter.com/keffbello"
layout: post
tags: [programming, probabilities, expected value, codeforces]
categories: [postk]
author_name: Kevin Bello
---

[Link to problem][52a5d5eb]

[52a5d5eb]: http://codeforces.com/problemset/problem/518/D "Ilya and Escalator"

**Overview:** There are \\(n\\) people waiting in a queue to enter a escalator. At each second the person in front of the queue either enters the escalator with probability \\(p\\) or doesn't move with probability \\(1-p\\), making the whole queue wait behind him. The problem asks to find the expected value of the number of people standing on the escalator after \\(t\\) seconds. The input consists of a line with three numbers \\(n, p, t\\) \\((1 \le n, t \le 2000, 0 \le p \le 1)\\). Numbers \\(n\\) and \\(t\\) are integers, number \\(p\\) is real, given with exactly two digits after the decimal point.

The solution becomes simpler by using the dynamic programming paradigm. The most straightforward random variable to get the answer would be \\( \mathrm{X\_t} = \\) the number of people in the escalator after t seconds.
And the expected value would be \\( \mathrm{E[X\_{t}]} = \sum\_{i=1}^{n}{i*\mathrm{Pr[X\_{t}}=i\mathrm{]}} \\). Where \\( \mathrm{Pr[X\_{t}}=i\mathrm{]} \\) is the probability that \\( i \\) people are in the escalator after \\( t \\) seconds.

Now to calculate the probability, we need to be careful with the dependency of the \\(i^{th}\\) person on the \\(\(i-1\)^{th}\\) person in the queue. However, if we think about it, to reach that state at \\( j\\) seconds we have to make it through whatever the states are at \\(j-1\\) seconds. And not surprisingly, there are only two possible states at \\(j-1\\) seconds. Either there are \\(i-1\\) people in the escalator, which is \\( \mathrm{Pr[X\_{j-1}}=i-1\mathrm{]} \\), or there are already \\(i\\) people in the escalator, which is \\( \mathrm{Pr[X\_{j-1}}=i\mathrm{]} \\).

Combining them we can easily calculate the state where there are \\(i\\) people after \\(j\\) seconds. If there are \\(i-1\\) people at \\(j-1\\) seconds, then in the next second, person \\(i\\) enters with probability \\(p\\). And if there are already \\(i\\) people at \\(j-1\\) seconds, then in the next second, person \\(i+1\\) does not move with probability \\(1-p\\). Therefore, we have:

<!--more-->

\\[ \mathrm{Pr[X\_{j}}=i\mathrm{]} = \mathrm{Pr[X\_{j-1}}=i-1\mathrm{]} * p + \mathrm{Pr[X\_{j-1}}=i\mathrm{]} * (1-p) \\]

A final remark: when \\(i = n\\), the second term of the sum is no longer valid because there is no \\(n+1\\) person trying to enter. Thus, the set of all possible states considering base cases is:

<div> $$
\mathrm{Pr[X_{j}}=i\mathrm{]} = \begin{cases}  
1 & i = 0, j = 0 \\
0 &  i \gt 0, j = 0 \\
(1-p)^{j} &  i = 0, j \gt 0 \\
\mathrm{Pr[X_{j-1}}=i-1\mathrm{]} * p + \mathrm{Pr[X_{j-1}}=i\mathrm{]} & i=n\\
\mathrm{Pr[X_{j-1}}=i-1\mathrm{]} * p + \mathrm{Pr[X_{j-1}}=i\mathrm{]} * (1-p) & \text{otherwise}
\end{cases} 
$$ </div>

As we can observe, finding the probabilities has a complexity of \\(O\(n*t\)\\). Thus being feasible to pass the time constraints. Once the probabilities are calculated, we just need to sum up and multiply to get the expected value.

Code snippet in C++:

<script src="https://gist.github.com/kevinbm/a7a3c0460ed81e6c5420344163f1814f.js"></script>
