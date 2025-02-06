# 共识层（CL）架构

> 许多区块链共识协议都是*可分叉的*。可分叉的链使用分叉选择规则，有时会发生重组。
>
> 以太坊的共识协议结合了两个独立的共识协议。_LMD GHOST_ 本质上提供活性。_Casper FFG_ 提供最终性。这两者共同被称为 _Gasper_。
>
> 在一个*活性*协议中，好的事情总会发生。在一个*安全*协议中，坏的事情永远不会发生。没有任何实用的协议能够始终保持安全性的同时又始终保持活性。

## 分叉选择机制

如[BFT](BFT)中所述，由于各种原因 - 比如网络延迟、中断、消息乱序或恶意行为 — 网络中的节点可能会对网络状态有不同的认知。最终，我们希望每个诚实节点都能就一个相同的、线性的历史记录和系统状态的共同视图达成一致。协议的分叉选择规则正是帮助实现这种共识的机制。

#### 区块树

基于区块树和节点对网络本地视图的决策标准，分叉选择规则旨在选择最有可能成为最终规范链的分支。它选择在节点收敛到共同视图时最不可能被剪枝的分支。

<a id="img_blocktree"></a>

<figure class="diagram" style="text-align:center; width:95%">

![Diagram for Block Tree](../images/cl/blocktree.svg)

_分叉选择规则从候选区块中选择一个头区块。头区块标识了一条从创世区块开始的唯一线性区块链。_

</figcaption>
</figure>

#### 分叉选择规则

分叉选择规则通过选择分支末端的区块（称为头区块）来隐式地选择一个分支。对于任何正确的节点来说，任何分叉选择的首要规则是：被选中的区块必须根据协议规则是有效的，并且它的所有祖先区块也必须是有效的。任何无效区块都会被忽略，基于无效区块构建的区块也是无效的。

以下是几个不同分叉选择规则的例子：

- **工作量证明(Proof-of-work)**：在以太坊和比特币中，使用"最重链规则"（有时被称为"最长链"，但这种说法并不严格准确）。头区块是累积"工作量"最多的链的末端区块。
  > 需要注意的是，与普遍的认知相反，以太坊的工作量证明协议[并没有使用](https://ethereum.stackexchange.com/questions/38121/why-did-ethereum-abandon-the-ghost-protocol/50693#50693)任何形式的 GHOST 作为分叉选择规则。这个误解一直存在，可能是因为[以太坊白皮书](https://ethereum.org/en/whitepaper/#modified-ghost-implementation)的缘故。最终当 Vitalik 被问到这个问题时，他确认虽然在 PoW 下曾计划使用 GHOST，但由于担心某些未明确的攻击而从未实施。最重链规则更简单且经过充分测试，运行良好。
- **Casper FFG (权益证明)**：在以太坊的 PoS Casper FFG 协议中，分叉选择规则是"遵循包含**最高高度**已证明检查点的链"，并且永远不会回滚已最终确定的区块。
- **LMD GHOST (权益证明)**：在以太坊的 PoS LMD GHOST 协议中，分叉选择规则是选择"最贪婪最重可观察子树"。这涉及计算验证者对区块及其子孙区块的累积投票。它同样也应用 Casper FFG 的规则。

这些分叉选择规则都会为区块分配一个数值分数。得分最高的区块即为头区块。目标是让所有正确的节点在看到某个区块时，都会认同它是头区块并跟随它的分支。这样，所有正确的节点最终都会就一条从创世区块开始的规范链达成一致。

#### 重组和回滚

当节点接收到新的投票（在权益证明中包括对区块的新投票）时，它会根据这些新信息重新评估分叉选择规则。通常情况下，新区块会是当前头区块的子区块，并成为新的头区块。

然而，有时新区块可能是区块树中另一个区块的后代。如果节点没有这个新区块的父区块，它会向其对等节点请求该区块以及其他缺失的区块。

在更新后的区块树上运行分叉选择规则可能会显示，新的头区块位于与之前头区块不同的分支上。当这种情况发生时，节点必须执行重组（reorganisation）。这意味着它将移除（回滚）之前包含的区块，并采用新头区块所在分支上的区块。

例如，如果一个节点的链上有区块 $A, B, D, E,$ 和 $F$，并且它将 $F$ 视为头区块，它知道有区块 $C$ 的存在但在其当前的链视图中并不出现；该区块位于侧分支上。

<a id="img_reorg0"></a>

<figure class="diagram" style="text-align:center">

![Diagram for Reorg-0](../../images/cl/reorg-0.svg)

<figcaption>

_此时，节点认为区块 $F$ 是最佳头区块，因此它的链是区块 $[A \leftarrow B \leftarrow D \leftarrow E \leftarrow F]$_

</figcaption>
</figure>

当节点随后收到构建在区块 $C$ 上而不是当前头区块 $F$ 上的区块 $G$ 时，它必须决定是否应该将 $G$ 作为新的头区块。举例来说，如果分叉选择规则表明 $G$ 是更好的头区块，节点将回滚区块 $D、E$ 和 $F$。它会将这些区块从链上移除，就像从未收到过它们一样，并回退到区块 $B$ 之后的状态。

然后，节点会将区块 $C$ 和 $G$ 添加到它的链上并处理它们。在这次重组之后，节点的链将包含 $A、B、C$ 和 $G$。

<a id="img_reorg1"></a>

<figure class="diagram" style="text-align:center">

![Diagram for Reorg-1](../../images/cl/reorg-1.svg)

<figcaption>

_此时，节点认为区块 $G$ 是最佳头区块，因此它的链必须改变为区块 $[A \leftarrow B \leftarrow C \leftarrow G]$_

</figcaption>
</figure>

后来，可能出现一个区块 $H$，它构建在区块 $F$ 上，分叉选择规则说 $H$ 应该是新的头区块，节点将再次重组，回滚到区块 $B$ 并重新播放 $H$ 分支上的区块。

由于网络延迟，一两个区块的短重组是很常见的。除非链遭受攻击，或者分叉选择规则及其实现存在漏洞，否则较长的重组应该很少发生。

### 安全性和活性

在共识机制中，有两个关键概念：安全性和活性。

**安全性**意味着"坏事永远不会发生"，比如防止双重支付或确认冲突的检查点。它确保一致性，这意味着所有诚实节点应该始终对区块链的状态达成一致。

**活性**意味着"好事最终会发生"，确保区块链始终能添加新的区块，永远不会陷入死锁状态。

**CAP 定理**指出没有分布式系统能够同时提供一致性、可用性和分区容错性。这意味着当通信不可靠时，我们无法设计出在所有情况下都既安全又活跃的系统。

#### 以太坊优先保证活性

以太坊的共识协议旨在在良好的网络条件下同时提供安全性和活性。然而，在网络出现问题时，它优先保证活性。在网络分区的情况下，每个分区的节点都会继续产生区块，但无法达成最终确定性（这是一个安全性属性）。如果分区持续存在，每个分区可能会确定不同的历史记录，导致形成两条无法调和的独立链。

因此，虽然以太坊努力同时实现安全性和活性，但它倾向于确保网络保持活跃并继续处理交易，即使在严重的网络中断期间可能会带来潜在的安全性问题。

## 机器中的幽灵

以太坊的权益证明共识协议结合了两个独立的协议：[LMD GHOST](/wiki/cl/gasper?id=lmd-ghost.md) 和 [Casper FFG](/wiki/cl/gasper?id=casper-ffg.md)。这两者共同被称为 "Gasper" 共识协议。关于这两个协议的详细信息以及它们如何协同工作将在下一节 [Gasper] 中详细介绍。

Gasper 旨在结合 LMD GHOST 和 Casper FFG 的优势。LMD GHOST 提供活性，通过定期产生新区块确保链持续运行。然而，它容易产生分叉且在形式上并不安全。另一方面，Casper FFG 通过定期对链进行最终确定来提供安全性，防止长程回滚。

本质上，LMD GHOST 保持链向前推进，而 Casper FFG 通过确定区块来确保稳定性。这种组合使以太坊能够优先保证活性，意味着即使 Casper FFG 无法确定区块，链仍然能继续增长。尽管这种组合机制并非完美且存在一些复杂性，但它是一个在实践中运行良好的工程解决方案。

## 架构

以太坊是一个由节点组成的去中心化网络，这些节点通过点对点连接进行通信。这些连接由运行以太坊客户端软件的计算机形成。

<a id="img_network"></a>

<figure class="diagram" style="text-align:center">

![Diagram for Network](../../images/cl/network.png)

<figcaption>

_节点不需要运行验证者客户端（绿色节点）就可以成为网络的一部分，但是要参与共识，则需要质押 32 ETH 并运行验证者客户端。_

</figcaption>
</figure>

### 共识层的组件

- **信标节点**：信标节点使用客户端软件来协调以太坊的权益证明共识。例如 Prysm、Teku、Lighthouse 和 Nimbus。信标节点与其他信标节点、本地执行节点以及（可选的）本地验证者进行通信。

- **验证者**：验证者客户端是允许人们在以太坊共识层质押 32 ETH 的软件。验证者在权益证明系统中负责提议区块，取代了工作量证明中的矿工。验证者只与本地信标节点通信，后者为其提供指令并将其工作广播到网络中。

承载真实应用的主要以太坊网络被称为以太坊主网。以太坊主网是以太坊的实时生产环境，用于铸造和管理真实的以太币（ETH）并具有实际货币价值。

此外还有测试网络，用于铸造和管理测试用的以太币，供开发者、节点运营者和验证者在使用主网真实 ETH 之前测试新功能。每个以太坊网络都有两层：执行层（EL）和共识层（CL）。每个以太坊节点都包含这两层的软件：执行层客户端软件（如 Nethermind、Besu、Geth 和 Erigon）和共识层客户端软件（如 Prysm、Teku、Lighthouse、Nimbus 和 Lodestar）。

<a id="img_node-layers"></a>

<figure class="diagram" style="width: 80%;text-align:center">

![Diagram for CL](../../images/cl/cl.png)

</figure>

**共识层**负责维护共识链（信标链）并处理从其他对等节点接收到的共识区块（信标区块）和证明。**共识客户端**参与一个独立的[点对点网络](/wiki/cl/cl-networking.md)，其规范与执行客户端不同。它们需要参与区块传播以接收来自对等节点的新区块，并在轮到它们提议时广播区块。

执行层和共识层客户端并行运行，需要保持连接以进行通信。共识客户端向执行客户端提供指令，执行客户端则将交易包传递给共识客户端以包含在信标区块中。通信通过本地 RPC 连接使用 **Engine-API** 实现。它们共享一个 [ENR](/wiki/cl/cl-networking?id=ethereum-enr)，但每个客户端使用独立的密钥（eth1 密钥和 eth2 密钥）。

### 控制流程

**当共识客户端不是区块生产者时：**

1. 通过区块 gossip 协议接收区块。
2. 对区块进行预验证。
3. 将区块中的交易作为执行负载发送到执行层。
4. 执行层执行交易并验证区块状态。
5. 执行层将验证数据发送回共识层。
6. 共识层将区块添加到其区块链中并对其进行证明，将证明广播到网络中。

**当共识客户端是区块生产者时：**

1. 收到成为下一个区块生产者的通知。
2. 调用执行客户端中的创建区块方法。
3. 执行层访问交易内存池。
4. 执行客户端将交易打包成区块，执行它们，并生成区块哈希。
5. 共识客户端将交易和区块哈希添加到信标区块中。
6. 共识客户端通过区块 gossip 协议广播区块。
7. 其他客户端验证区块并对其进行证明。
8. 一旦得到足够验证者的证明，区块就会被添加到链头，被证明合理性并最终确定。

### 状态转换

状态转换函数在区块链中至关重要。每个节点维护一个反映其对世界认知的状态。

节点通过按顺序应用区块使用"状态转换函数"来更新它们的状态。这个函数是"纯函数"，意味着其输出仅依赖于输入且没有副作用。因此，如果每个节点从相同的状态（创世状态）开始并应用相同的区块，它们最终都会得到相同的状态。如果不是这样，就说明出现了共识失败。

如果 $S$ 是信标状态，$B$ 是信标区块，则状态转换函数 $f$ 为：

$$S' \equiv f(S, B)$$

这里，$S$ 是前置状态，$S'$ 是后置状态。函数 $f$ 随着每个新区块的到来而迭代执行以更新状态。

### 信标链状态转换

与区块驱动的工作量证明不同，信标链是槽驱动的。状态更新取决于槽的进展，而不依赖于区块是否存在。

信标链的状态转换函数包括：

1. **每槽转换**: $S' \equiv f_s(S)$
2. **每块转换**: $S' \equiv f_b(S, B)$
3. **每周期转换**: $S' \equiv f_e(S)$

每个函数都按照信标链规范中定义的特定时间更新链。

### 有效性条件

从前置状态和已签名区块得到的后置状态是通过 `state_transition(state, signed_block)` 计算的。导致未处理异常（例如，断言失败或越界访问）或 uint64 溢出/下溢的转换都是无效的。

### 信标链状态转换函数

从前置状态 `state` 和已签名区块 `signed_block` 得到的后置状态是通过 `state_transition(state, signed_block)` 定义的。触发未处理异常（例如，`assert` 断言失败或列表越界访问）的状态转换被视为无效。导致 `uint64` 溢出或下溢的状态转换也被视为无效。

```python
def state_transition(state: BeaconState, signed_block: SignedBeaconBlock, validate_result: bool=True) -> None:
    block = signed_block.message
    # Process slots (including those with no blocks) since block
    process_slots(state, block.slot)
    # Verify signature
    if validate_result:
        assert verify_block_signature(state, signed_block)
    # Process block
    process_block(state, block)
    # Verify state root
    if validate_result:
        assert block.state_root == hash_tree_root(state)
```

```python
def verify_block_signature(state: BeaconState, signed_block: SignedBeaconBlock) -> bool:
    proposer = state.validators[signed_block.message.proposer_index]
    signing_root = compute_signing_root(signed_block.message, get_domain(state, DOMAIN_BEACON_PROPOSER))
    return bls.Verify(proposer.pubkey, signing_root, signed_block.signature)
```

```python
def process_slots(state: BeaconState, slot: Slot) -> None:
    assert state.slot < slot
    while state.slot < slot:
        process_slot(state)
        # Process epoch on the start slot of the next epoch
        if (state.slot + 1) % SLOTS_PER_EPOCH == 0:
            process_epoch(state)
        state.slot = Slot(state.slot + 1)
```

## Resources

- Vitalik Buterin, ["Parametrizing Casper: the decentralization/finality time/overhead tradeoff"](https://medium.com/@VitalikButerin/parametrizing-casper-the-decentralization-finality-time-overhead-tradeoff-3f2011672735)
- [Engine API spec](https://hackmd.io/@n0ble/consensus_api_design_space)
- [Vitalik's Annotated Ethereum 2.0 Spec](https://notes.ethereum.org/@vbuterin/SkeyEI3xv)
- Ethereum, ["Eth2: Annotated Spec"](https://github.com/ethereum/annotated-spec)
- Martin Kleppmann, [Distributed Systems.](https://www.youtube.com/playlist?list=PLeKd45zvjcDFUEv_ohr_HdUFe97RItdiB)
- Leslie Lamport et al., [The Byzantine Generals Problem.](https://lamport.azurewebsites.net/pubs/byz.pdf)
- Austin Griffith, [Byzantine Generals - ETH.BUILD.](https://www.youtube.com/watch?v=c7yvOlwBPoQ)
- Michael Sproul, ["Inside Ethereum"](https://www.youtube.com/watch?v=LviEOQD9e8c)
- [Eth2 Handbook by Ben Edgington](https://eth2book.info/capella/part2/consensus/)
