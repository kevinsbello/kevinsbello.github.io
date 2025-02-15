---
layout: single
author_profile: true
classes: wide
title: Software
---

{::options auto_ids="false" /}

## Software

<div class='software' markdown='1'>

> ### iSCAN
> The [`iscan-dag`][iscan_pip] library is a Python 3 package designed for detecting which variables, if any, have undergo a casual mechanism shift given multiple heterogeneous datasets. iSCAN does not make parametric assumptions on the functional relationship between causal variables.
> 
> <div class="links" markdown="1">
> [<i class="fas fa-file-alt"></i> Paper][iscan_paper]{:target="_blank"} [<i class="fab fa-github"></i> Code][iscan_code]{:target="_blank"} [<i class="fas fa-book"></i> Documentation][iscan_doc]{:target="_blank"}
> </div>

> ### TOPO
> Improved continuous constrained optimization for DAG structure learning with optimality guarantees. TOPO can be used with any loss function and includes implementations for both linear and nonlinear (e.g. neural network) models.
> 
> <div class="links" markdown="1">
> [<i class="fas fa-file-alt"></i> Paper][topo_paper]{:target="_blank"} [<i class="fab fa-github"></i> Code][topo_code]{:target="_blank"}
> </div>

> ### DAGMA
> The [`dagma`][dagma_pip] library is a Python 3 package that provides faster and more accurate continuous constrained optimization for structure learning based on a new acyclicity characterization via the log-det function. DAGMA can be used with any loss function and includes implementations for both linear and nonlinear (e.g. neural networks) models.
> 
> <div class="links" markdown="1">
> [<i class="fas fa-file-alt"></i> Paper][dagma_paper]{:target="_blank"} [<i class="fab fa-github"></i> Code][dagma_code]{:target="_blank"} [<i class="fas fa-book"></i> Documentation][dagma_doc]{:target="_blank"}
> </div>

</div>

[dagma_paper]: https://arxiv.org/abs/2209.08037
[dagma_code]: https://github.com/kevinsbello/dagma
[dagma_doc]: https://dagma.readthedocs.io/en/latest/
[dagma_pip]: https://pypi.org/project/dagma/

[topo_code]: https://github.com/Duntrain/TOPO
[topo_paper]: https://arxiv.org/abs/2305.17277

[iscan_paper]: https://arxiv.org/abs/2306.17361
[iscan_code]: https://github.com/kevinsbello/iscan
[iscan_doc]: https://iscan-dag.readthedocs.io/en/latest/
[iscan_pip]: https://pypi.org/project/iscan-dag/