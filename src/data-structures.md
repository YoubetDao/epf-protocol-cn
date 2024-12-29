# 执行层中的数据结构

执行客户端存储当前状态和历史区块链数据。在实际应用中，Ethereum 数据通常以类似 Trie（前缀树）结构的方式存储，主要使用 Merkle Patricia 树。

## RLP

[RLP](./RLP.md)

## Merkle 树概述

Merkle 树是一种基于哈希的数据结构，能够保证数据完整性，且能高效验证数据是否被篡改。它是一种树形结构，其中叶节点存储数据值，每个非叶节点存储其子节点的哈希值。

Merkle 树通过生成整个交易集的数字指纹来存储区块中的所有交易。它允许用户验证某笔交易是否包含在一个区块中。Merkle 树是通过反复计算节点对的哈希值直到只剩下一个哈希值来构建的。这个哈希值被称为 Merkle 根（Merkle Root），或者根哈希（Root Hash）。Merkle 树是以自底向上的方式构建的。

值得注意的是，Merkle 树是一种二叉树，因此它需要偶数个叶子节点。如果交易的数量是奇数，那么最后一个哈希值会被重复一次，以确保叶子节点数量为偶数。

Merkle 树提供了一种防篡改的结构，用于存储交易数据。哈希函数具有雪崩效应（Avalanche Effect），即数据的微小变化会导致结果哈希值发生巨大变化。因此，如果叶子节点中的数据被修改，根哈希值将与预期的值不匹配。你可以尝试自己使用 [SHA-256 哈希函数](https://emn178.github.io/online-tools/sha256.html)来进行验证。如果想了解更多关于哈希的内容，你可以参考[这里](https://github.com/ethereumbook/ethereumbook/blob/develop/04keys-addresses.asciidoc)。

Merkle 根（Merkle Root）被存储在区块头中。要了解更多关于以太坊区块结构的内容（链接将在相关文档准备好后提供）。

主父节点称为根节点，因此其中的哈希值就是根哈希（Root Hash）。对于单个 SHA-256 哈希，生成两个不同状态的相同根哈希的几率极其小（大约是 1/1.16x10^77），并且任何试图修改状态的操作都会导致不同的状态根哈希。

下图展示了 Merkle 树工作原理的简化版本：

- 叶子节点包含实际数据（为简化，例子中使用的是数字）。
- 每个非叶子节点是其子节点哈希的结果。
- 第一层的非叶子节点包含其子叶子节点的哈希值 Hash(1,2)。
- 同样的过程会一直持续，直到到达树顶，最终形成一个包含所有先前哈希值的哈希值 Hash[Hash(1,2), Hash(3,4), Hash(5,6), Hash(7,8)]。

以太坊 Merkle 树更多内容可以参考[这里](https://blog.ethereum.org/2015/11/15/merkling-in-ethereum)。

![Merkle Tree](./images/merkle-tree.jpg)

## Patricia 树概述

Patricia Trie（也叫 Radix Trie）是 n 叉字典树，与 Merkle 树不同，它用于数据存储而非验证。

Patricia Trie 是一种树形数据结构，所有数据均存储在叶子节点。每个非叶子节点是唯一标识数据的字符串中的一个字符或一个字符序列。我们使用这个唯一标识通过字符节点导航，最终到达数据所在位置。因此，它在数据检索方面非常高效。。

Patricia Trie 通过消除只有一个子节点的冗余节点，比传统的 Trie 结构更节省空间。它通过在键之间共享前缀来实现紧凑性。这意味着，多个键之间的公共前缀会被共享，从而减少整体存储需求。

## 以太坊中的 Merkle Patricia Trie

以太坊用于存储执行层状态的主要数据结构是 Merkle Patricia Trie（简称 MPT，发音为 “try”）。之所以命名为 Merkle Patricia Trie，是因为它结合了 Merkle 树和 PATRICIA（Practical Algorithm To Retrieve Information Coded in Alphanumeric）算法的特点，并且它的设计旨在高效地检索构成以太坊状态的各个数据项。

MPT 中有三种类型的节点：

- 分支节点（Branch Nodes）：一个分支节点由一个 17 元素的数组构成，其中包括一个节点值和 16 个分支。这个节点类型是 MPT 进行分支和遍历的主要机制。
- 扩展节点（Extension Nodes）：这些节点作为 MPT 中的优化节点。当一个分支节点只有一个子节点时，扩展节点就发挥作用。为了避免为每个分支重复路径，MPT 会将路径压缩为一个扩展节点，保存路径和子节点的哈希值。
- 叶子节点（Leaf Nodes）：一个叶子节点代表一个键值对。值是 MPT 节点的内容，而键是节点的哈希值。叶子节点存储特定的键值数据。

每个节点都有一个哈希值。节点的哈希值是其内容的 SHA-3 哈希值，这个哈希值也作为引用该节点的键。Nibbles（半字节）是 MPT 中用于区分键值的单位，代表一个十六进制数字。每个 Trie 节点最多可以分支到 16 个子节点，从而确保了紧凑的表示和高效的内存使用。

TODO：Patricia 树图示

## 以太坊

以太坊用于存储执行层状态的主要数据结构是 Merkle Patricia Trie（发音为 “try”）。它之所以被命名为 Merkle Patricia Trie，是因为它结合了 Merkle 树的特性，并采用了 PATRICIA（Practical Algorithm To Retrieve Information Coded in Alphanumeric）算法的特点，同时它的设计旨在高效地检索构成以太坊状态的各个数据项。

以太坊的状态被存储在四个不同的修改版 Merkle Patricia Tries（MMPTs）中：

- 交易 Trie（Transaction Trie）
- 回执 Trie（Receipt Trie）
- 世界状态 Trie（World State Trie）
- 账户状态 Trie（Account State Trie）

![tries](./images/tries.png)

在每个区块中，都有一个交易、回执和状态 trie，这些 trie 在区块头部通过其根哈希值进行引用。对于以太坊上每个部署的合约，都有一个存储 trie 用于保存该合约的持久变量，每个存储 trie 都通过其根哈希值在状态 trie 中对应合约地址的状态账户对象中进行引用。

## 交易 Trie

交易 Trie 是一个数据结构，用于存储特定区块中的所有交易。每个区块都有自己的交易 Trie，存储该区块中包含的相应交易。以太坊是一个基于交易的状态机，这意味着以太坊中的每一个操作或状态变更都源于一笔交易。每个区块由区块头和交易列表（以及其他内容）组成。因此，一旦交易被执行并且区块被最终确认，该区块的交易 Trie 就无法再被更改（与世界状态 Trie 不同）。

![transaction-trie](./images/transaction-trie.png)

每笔交易在交易 Trie 中有一个映射，其中键是交易的索引，值是交易 T。交易索引和交易本身都采用 RLP 编码。它们组成一个键值对，存储在 Trie 中：`𝑅𝐿𝑃 (𝑖𝑛𝑑𝑒𝑥) → 𝑅𝐿𝑃 (𝑇)`

交易 T 的结构包括以下内容：

- **Nonce**：每次相同发送者提交新交易时，nonce 会递增。这个值用于跟踪交易的顺序，并防止重放攻击。
- **maxPriorityFeePerGas**：交易中用于给验证者的小费的最大 Gas 价格。
- **gasLimit**：交易可以消耗的最大 Gas 单位数。
- **maxFeePerGas**：交易中每单位 Gas 愿意支付的最大费用（包括 baseFeePerGas 和 maxPriorityFeePerGas）。
- **from**：交易发起者的地址，该地址将签署交易。必须是外部拥有账户（EOA），因为合约账户不能发送交易。
- **to**：接收资金的账户地址，或为合约创建时为零。
- **value**：从发送者转账给接收者的 ETH 数量。
- **input data**：可选字段，包含任意数据。
- **data**：消息调用的输入数据，以及消息的签名。
- **(v, r, s)**：编码发送者签名的值。作为发送者的标识符。

TODO: 解释收据树（Receipt Trie）

TODO: 解释全局状态树（World State Trie）

![eth-tries](./images/eth-tries.png)

TODO: 解释存储树（Storage Trie）

## 未来的实现

## Verkle 树

[Verkle 树](https://verkle.info/)是一种新的数据结构，旨在取代当前的 Merkle Patricia Trie（MPT）。它的名称来自“向量承诺（Vector commitment）“和“Merkle 树”这两个概念的结合，设计上比当前的 MPT 更高效、更具可扩展性。Verkle 树是一种基于 Trie 的数据结构，它用轻量级的证明替代了 MPT 中使用的重型证明。Verkle 树是[以太坊“Verge”升级](https://ethereum.org/en/roadmap/#what-about-the-verge-splurge-etc)的关键部分。它们能够使[无状态](https://ethereum.org/en/roadmap/statelessness/#statelessness)客户端变得更加高效和可扩展。

## Verkle 树的结构

Verkle 树的布局结构与 MPT 类似，但树的基数（即每个节点的子节点数量）不同。就像 [MPT](https://ethereum.org/en/developers/docs/data-structures-and-encoding/patricia-merkle-trie/#optimization) 一样，它有根节点、内部节点、扩展节点和叶节点。唯一的区别在于树的键的大小，MPT 使用的是 20 字节的键，而 Verkle 树使用的是 32 字节的键，其中 31 字节作为树的主干，而最后 1 字节用于存储具有几乎相同主干地址或相邻代码块的数据（开启相同的承诺会更便宜）。此外，由于在计算证明数据时，算法使用了 252 位作为字段元素，因此使用 31 字节作为树的后缀是更方便的。这样，主干数据可以承诺两种不同的承诺，分别是 0-127 和 128-255，即相同键的下值和上值，从而覆盖整个后缀空间。有关更多信息，请参阅[此处](https://blog.ethereum.org/2021/12/02/verkle-tree-structure)。

![verkle-tree](./images/verkle_tree_structure.png)

## MPT 和 Verkle 树的主要区别

Merkle/MP 树的深度很大，因为其树结构在每个节点处是二叉的（2/16 叉树）。这意味着，叶节点的证明数据是从根节点到叶节点的路径。由于每一层还需要包含兄弟节点的哈希数据，这使得对于一棵大的树来说，证明数据会非常庞大。而 Verkle 树的宽度较大，因为其树结构在每个节点处是 n 叉的。因此，叶节点的证明数据是从叶节点到根节点的路径，这对于一棵大的树来说可以非常小。目前，Verkle 树建议每个节点有 256 个子节点。更多信息参与[此处](https://ethereum.org/en/roadmap/verkle-trees/)。

Merkle/MP 树的中间节点是子节点的哈希值，而 Verkle 树的节点则携带一种特殊类型的哈希，称为“向量承诺”（vector commitments），用于对其子节点进行承诺。这意味着，在 Verkle 树中，叶节点的证明数据是沿着从叶节点到根节点路径的子节点的承诺。此外，通过聚合这些承诺来计算证明，使得验证过程非常紧凑。有关证明系统的更多信息，请参阅[相关内容](https://dankradfeist.de/ethereum/2021/06/18/pcs-multiproofs.html?ref=hackernoon.com)。

## 为什么选择 Verkle 树？

要使客户端无状态（stateless），关键在于客户端验证区块时无需存储整个或之前的区块链状态。新接收的区块应能提供客户端验证该区块所需的必要数据。这些额外的证明数据称为见证数据（witness），使得无状态客户端能够在不需要完整状态的情况下验证数据。通过区块内的信息，客户端还应该能够随着每个传入区块的到来来维护或增长本地状态。使用这种方式，客户端保证对当前区块（以及其后验证的区块）的状态转换是正确的。这并不保证对当前区块引用的先前区块的状态是正确的，因为区块生产者可能构建在无效或非规范的区块之上。

Verkle 树旨在在存储和通信成本方面更加高效。对于 1000 个叶子/数据，一个二叉 Merkle 树大约需要 4MB 的证明数据，而 Verkle 树则将其减少到 150KB。如果我们将证明数据包含在区块中，它不会对区块大小产生太大影响，但它将使无状态客户端更高效和可扩展。通过这种方式，无状态客户端将能够信任计算结果，而无需存储整个状态。

然而，向新的 Verkle 树数据库过渡面临着重大挑战。为了安全地创建新的 Verkle 数据，客户端需要从现有的 MPT 中生成它们，这需要大量的计算和空间。目前，Verkle 数据库的分发和验证仍在研究中。

## 参考资料

- [More on Merkle Patricia Trie](https://ethereum.org/en/developers/docs/data-structures-and-encoding/patricia-merkle-trie/)
- [More on Verkle Tree](https://notes.ethereum.org/@vbuterin/verkle_tree_eip#Simple-Summary)
- [Verge transition](https://notes.ethereum.org/@parithosh/verkle-transition)
- [Implementing Merkle Tree and Patricia Trie](https://medium.com/coinmonks/implementing-merkle-tree-and-patricia-trie-b8badd6d9591) • [archived](https://web.archive.org/web/20210118071101/https://medium.com/coinmonks/implementing-merkle-tree-and-patricia-trie-b8badd6d9591)
