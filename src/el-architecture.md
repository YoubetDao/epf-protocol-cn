# 客户端架构

## 概述

在执行层客户端的核心职责——交易执行之外，它还承担了若干关键责任。这些包括验证区块链数据并存储其本地副本，通过 Gossip 协议与其他执行层客户端进行网络通信，维护交易池，以及满足共识层的需求。这种多层次的操作确保了以太坊网络的稳健性和完整性。

客户端架构基于多种特定标准构建，每种标准在整体功能中都扮演着独特角色。执行引擎位于架构的顶部，驱动执行层，而执行层则由共识层驱动。执行层运行在 DevP2P 网络层之上，并通过提供合法的引导节点(boot nodes)作为进入网络的初始接入点。当我们调用一个引擎 API 方法(例如 fork choice updated)时，可以通过我们选择的同步模式订阅相关的主题，从对等节点下载区块。

<img src="images/el-architecture/architecture-overview.png" width="1000"/>

上图展示了执行层客户端的简化架构，省略了一些组件。

### **EVM**

以太坊围绕一个虚拟化的中央处理单元(CPU)构建。计算机在硬件层面有自己的 CPU，例如 x86、ARM、RISC-V 等。每种处理器架构都有独特的指令集，用于执行诸如算术、逻辑和数据处理等任务，使计算机成为通用计算设备。因此，当使用硬件层面的指令集执行程序时，结果可能会因硬件的不同而有所变化。在计算机科学中，我们通过创建虚拟机(例如 JVM)来虚拟化指令集，以确保无论底层硬件如何，执行结果都一致。 EVM 是专为以太坊程序设计的虚拟化执行引擎，它确保了执行结果一致性，并在所有以太坊客户端之间就计算结果达成共识。

此外，以太坊采用了一种“sandwich complexity model”的设计哲学。这意味着外层应该简单，而所有的复杂性都集中在中间层。在这个框架下， EVM 的代码可以被视为最外层，而高层语言(如 Solidity)可以视为顶层。中间有一个复杂的编译器，将 Solidity 代码转换为 EVM 的字节码。

### **状态(State)**

以太坊是一个通用的计算系统，作为状态机运行，这意味着它可以根据接收到的输入在多个状态之间转换。此外，以太坊与其他区块链(如比特币)显著不同，因为它维护了全局状态，而比特币仅维护全局未花费交易输出(UTXOs)。“状态”指的是数据、数据结构(如 Merkle-Patricia Trie)以及存储各种信息的数据库的综合集合。这包括地址、余额、合约代码和数据，以及当前的状态和网络状态。

### **交易(Transactions)**

EVM 通过称为状态转换的过程生成数据并修改以太坊网络的状态。状态转换由交易触发，这些交易在 EVM 中处理。如果交易被视为合法，它将导致以太坊网络的状态发生变化。

### **DevP2P**

这是执行层客户端与其他客户端通信的接口。交易最初存储在交易池(mempool)中，作为所有传入交易的存储库。执行层客户端通过点对点通信将这些交易传播给网络中的其他执行层客户端。网络上的交易接收方会确认其合法性，然后再广播至整个网络。

### **JSON-RPC API**

当使用钱包或去中心化应用(DApp)时，我们通过标准化的 JSON-RPC API 与执行层通信。这使我们可以从外部查询以太坊的状态或发送交易(由钱包签名)，随后由执行层客户端验证并传播到整个网络。

### **引擎 API**

这是共识层与执行层之间交互的唯一接口。执行层通过引擎 API 向共识层提供两个主要的端点：**fork choice updated** 和 **new payload**。共识层通过这两个端点（每个都有 V1 到 V3 三个版本）来调用执行层的两个主要功能：

1. **New Payload** _(V1/V2/V3)_：共识层调用此接口来请求执行层验证和插入有效载荷。
2. **Fork Choice Updated** _(V1/V2/V3)_：共识层调用此接口来触发执行层进行状态同步和区块构建。

### **同步(Sync)**

为了正确处理以太坊上的交易，我们必须对网络的全局状态达成共识，而不仅仅依赖于本地视角。执行层客户端的全局状态同步由共识层的 LMD-GHOST 算法的 fork choice 规则触发，并通过引擎 API 的 fork choice updated 端点传递到执行层。同步包括两个过程：从对等方下载远程区块并在 EVM 中验证它们。

## **架构组件**

### **引擎(Engine)**

执行层客户端充当“执行引擎”，并通过 Engine API 提供一个认证端点，与共识层客户端连接。执行层客户端只能由单一的共识层驱动，但一个共识层客户端实现可以连接多个执行层客户端以实现冗余。Engine API 通过 HTTP 使用 JSON-RPC 接口，并需要通过 [JWT](https://jwt.io/introduction) 令牌进行身份验证。此外，Engine JSON-RPC 仅暴露给共识层，但 JWT 主要用于验证有效载荷的来源是共识层客户端，并不加密流量。

#### **例程**

##### **有效载荷验证(Payload validation)**

有效载荷根据区块头和执行环境规则进行验证：

<img src="images/el-architecture/payload-validation-routine.png" width="1000"/>

在以太坊合并后，执行层的功能在以太坊网络中发生了变化。此前，它负责管理区块链的共识，确保区块的正确顺序以及处理重组。然而，在合并后，这些任务被转交给共识层，从而显著简化了执行层。现在，我们可以将执行层视为主要执行状态转换功能。

为了更好地理解上述概念，有必要从共识层的角度审视执行层。共识规范在 deneb beacon 链规范中定义了执行载荷的处理过程，该过程在 beacon 链进行区块验证和共识层推进时执行。执行层在这里由 execution_engine 函数表示，该函数充当共识层与执行层之间的通信接口，具有许多复杂的实现。

在执行载荷处理过程中，我们首先进行几个高级检查，包括验证父哈希的准确性以及验证时间戳。此外，我们执行各种轻量级验证。随后，我们将载荷传输到执行层，在那里进行区块验证。notify payload 函数是最低级别的函数，充当共识层与执行引擎之间的接口。它仅包含函数签名，不包含任何实现细节。其唯一目的是将执行载荷传输到执行引擎，执行引擎充当执行层的客户端。执行引擎随后执行实际的状态转换函数，该函数涉及验证区块头的准确性并确保交易正确应用于状态。执行引擎最终将返回一个布尔值，表示状态转换是否成功。从共识层的角度来看，这仅仅是区块的验证。

这是一个简化版的区块级状态转换函数（stf）的 go 语言实现，该函数是区块验证和插入管道中的关键组件。虽然这个例子来自 Geth，但它代表了所有客户端中状态转换函数的基本工作方式。值得注意的是，除了 EELS python 规范客户端外，其他客户端的代码中很少直接使用"状态转换函数"这个名称，因为这个功能实际上被分散到了客户端架构的多个组件中。

```go
func stf(parent types.Block, block types.Block, state state.StateDB) (state.StateDB, error) { //1
    if err := core.VerifyHeaders(parent, block); err != nil { //2
            // header error detected
            return nil, err
  }
  for _, tx := range block.Transactions() { //3
      res, err := vm.Run(block.header(), tx, state)
      if err != nil {
              // transaction invalid, block is invalid
              return nil, err
      }
      state = res
  }
  return state, nil
}
```

1. 状态转换函数的参数和返回值

   - 在这个上下文中，我们检查父区块和当前区块，以验证从父区块到当前区块的某些转换逻辑。
   - 我们将状态数据库(state DB)作为参数输入，其中包含与父区块相关的所有状态数据。这代表了最新的有效状态。
   - 我们返回代表状态转换后更新状态的状态数据库(state DB)。
   - 如果状态转换失败，我们不会更新状态数据库并返回错误。

2. 状态转换函数的过程：首先验证区块头

   - 以区块头验证失败的一个例子为例，我们可以考虑“gas limit”(汽油限制)字段，这一字段在历史上也具有重要意义。目前，汽油限制约为 3000 万。需要注意的是，汽油限制在执行层中并不是固定的。区块生产者可以通过一种方法修改汽油限制，使其增加或减少上一区块汽油限制的 1/1024。因此，如果你在单个区块中将汽油限制从 3000 万提升到 4000 万，则区块头验证将失败，因为它超过了 3000 万加上其 1/1024 的阈值。
   - 其他区块头验证失败的实例包括区块号不按顺序排列的情况。通常，这种不一致由beacon 链负责检测，但在某些情况下，也可能在这个阶段被检测到。失败还可能发生在 1559 基准费用未根据上一次的汽油使用量与汽油限制的比较准确更新时。

3. 在区块头验证完成后，我们将区块头中的环境视为应执行交易的环境，并开始应用交易。我们对区块中的交易逐一迭代，并在 EVM 中执行每笔交易。
   - 区块头被传递给 EVM，以提供处理交易所需的上下文。此上下文包括诸如 coinbase(矿工奖励地址)、汽油限制和时间戳等指令，这些是正确执行交易所需的。
   - 此外，我们传入交易和状态。
   - 如果执行失败，我们仅返回错误，表明区块中存在无效交易，从而使整个区块无效。在执行层中，区块中任何错误都会使整个区块无效，因为它会污染整个区块。
   - 一旦确认交易的有效性，我们会用结果更新状态。此时的状态代表了应用了新块中所有交易后的累积状态。

从 beacon 链的角度来看，上述的状态转换函数由 `new payload` 函数的调用来实现。

```go
func newPayload(execPayload engine.ExecutionPayload) bool {
    if _, err := stf(..); err != nil {
        return false
  }
  return true
}
```

beacon 链调用 new payload 函数并传递执行载荷作为参数。在执行层，我们使用执行载荷中的信息调用状态转换函数。如果状态转换函数没有产生错误，我们返回 true。否则，返回 false 表示区块无效。

##### Geth

TODO: 添加 Geth 中状态转换函数的代码链接和详细说明

查看 lightclient 第二周的演讲获取概述。

##### 同步

执行客户端通过从对等节点下载区块数据并使用区块验证规则验证它们来同步链。当区块链数据被验证且客户端追上链的最新状态时，同步完成，这使得能够构建最新状态。

由于从创世区块开始逐个验证区块和交易效率低下，执行层客户端采用其他策略来安全地同步到链的最新状态，例如快照同步(snap sync)。

##### 载荷构建

更多详情请参见[区块生产](/wiki/EL/block-production.md)

#### 方法

##### New payload

验证之前由载荷构建例程构建的载荷。

<img src="images/el-architecture/new-payload.png" width="1000"/>

##### Fork choice updated

权益证明 LMD-GHOST 分叉选择规则和载荷构建的例程。

<img src="images/el-architecture/forkchoice-updated.png" width="1000"/>

### 内部共识引擎

执行层有自己的共识引擎，用于与 beacon 链的副本一起工作。执行层的共识引擎被称为 `ethone`，具有共识层完整共识引擎一半的功能。

| 功能                                                                             | Beacon (权益证明)                                                                                                                                                                                                                                                                     | Clique (权威证明)                                                                                                                                                                                                                                  | Ethash (Proof-of-work) |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Author**: 区块铸造者的以太坊地址                                               | 如果区块头被识别为 PoS 区块头(难度值为 0)，我们将获取区块头的 coinbase。否则，我们将区块头转发给 beacon 的 ethone 引擎(clique 或 ethash)进行进一步处理。                                                                                                                          | 获取创建区块的账户地址。通过 ecrecover 从区块头的 extraData 中恢复公钥。                                                                                                                                                                           |                        |
| **Verify Header(s)**: 处理一批区块头并根据当前共识引擎的规则验证它们             | 根据[最终总难度](https://eips.ethereum.org/EIPS/eip-3675#definitions)将区块头分为 TTD 前后两批。使用 ethone 引擎验证 TTD 之前的批次，使用 beacon 验证之后的批次。                                                                                                                     |                                                                                                                                                                                                                                                    |                        |
|                                                                                  | 我们执行类似于[执行层规范](wiki/EL/el-specs?id=block-header-validation)中的区块头验证。                                                                                                                                                                                               | 验证区块头的时间戳不大于系统时间。                                                                                                                                                                                                                 |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | 对于检查点区块(epoch 的第一个 slot)，确保没有受益人。                                                                                                                                                                                            |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | 区块头 nonce 可以有两个值：0x00..0 表示添加签名者的投票，0xff..f 表示删除签名者的投票。在检查点只能投票删除签名者。                                                                                                                                |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | extraData 长度必须包含 vanity + 签名。在检查点，extraData 包含签名者列表 + 签名。                                                                                                                                                                  |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | 执行区块头 gas 检查。                                                                                                                                                                                                                              |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | 获取快照。                                                                                                                                                                                                                                         |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | 在检查点区块验证快照中的签名者与 extraData。                                                                                                                                                                                                       |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | 调用 verify Seal 函数确定区块头中包含的签名是否满足所有条件。恢复过程涉及从区块头和 Clique 对象中的最近签名者列表提取信息。然后验证签名者是否包含在快照中。                                                                                        |                        |
| **Verify Uncles**: 验证叔块                                                      | 如果是 PoS 区块头，检查叔块长度为 0。如果不是 PoS 区块头，通过 ethone 引擎验证叔块。                                                                                                                                                                                                  | Clique 中不应该存在叔块                                                                                                                                                                                                                            |                        |
| **Prepare**: 初始化区块头的共识字段                                              | 如果达到 TTD，我们将区块头的难度设置为 beacon 的难度 0，否则调用 ethone 的 prepare                                                                                                                                                                                                    | 通过提供父哈希和编号创建投票快照。在反向迭代过程中，我们从区块号开始向后遍历。如果到达创世区块、使用不存储父区块的轻客户端、向后到达 epoch，或者遍历的区块头超过软终局值(表示该段被认为是不可变的)，我们就停止迭代。在停止迭代的检查点创建快照。 |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | 如果我们在 epoch 结束时，我们将遍历 snap 对象的 proposals 字段中的地址，随机选择一个作为 coinbase。如果提案被授权，我们将投出授权票；否则，我们将投出删除票。                                                                                      |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | 根据签名者的轮次设置区块头难度(如果签名者轮到则为 2，否则为 1)                                                                                                                                                                                   |                        |
|                                                                                  |                                                                                                                                                                                                                                                                                       | 验证 extraData 包含所有必要元素，包括 extraVanity 和如果区块发生在 epoch 结束时的签名者列表。这被添加到区块头的 extraData 字段。                                                                                                                   |                        |
| **Finalize**: 对状态进行更改后，可能会更新状态数据库，但这个操作不涉及区块的组装 | 如果区块头不是 PoS 区块头，我们执行 ethone 的 finalize 函数。否则，我们遍历区块中的提款，将其金额从 wei 转换为 gwei。然后我们通过将转换后的金额添加到与当前提款关联的地址来修改状态。                                                                                                 | Clique 没有后交易共识规则，权威证明中没有区块奖励                                                                                                                                                                                                  |                        |
| **FinalizeAndAssemble**: 完成并组装最终区块                                      | 如果区块头不是 PoS 区块头，我们调用 ethone 的 FinalizeAndAssemble。如果没有提款且区块在上海分叉之后，我们包含一个空的提款对象。接下来，我们调用 finalize 函数计算状态根。然后我们将这个值分配给区块头对象的 root 属性。最后，我们通过组合区块头、交易、叔块、收据和提款来构造新区块。 | 验证没有提款，调用 finalize 函数，计算我们的 stateDB 的状态根，并将其分配给区块头。使用区块头、交易和收据构造新区块。                                                                                                                              |                        |
| **Seal**: 生成区块的密封请求并将请求推送到给定通道                               | 如果区块头不是 PoS 区块头，我们调用 ethone 的 seal。否则，我们不采取任何操作并返回 nil。密封的验证由共识层执行。                                                                                                                                                                      | 确保区块不是初始区块，获取快照，并确认我们有权签名且不包含在最近签名者列表中。协调我们各自轮次的时间，应用签名函数进行签名，并通过指定通道传输安全密封的区块。                                                                                     |                        |
| **SealHash**: 密封前区块的哈希                                                   |                                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                                                    |                        |
| **CalcDifficulty**: 难度调整算法，返回新区块的难度                               |                                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                                                    |                        |

#### Client code

|                                                                                     | EELS(cancun)                                                                                                                                                                          | Geth | Reth | Erigon | Nethermind | Besu |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ------ | ---------- | ---- |
| $V(H) \equiv H_{gasUsed} \leq H_{gasLimit}$                                         | [validate_header](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L294)                                         |      |      |        |            |      |
| $H*{gasLimit} < P(H)*{H*{gasLimit'}} + floor(\frac{P(H)*{H\_{gasLimit'}}}{1024} ) $ | validate_header -> calculate_base_fee_per_gas -> [ensure](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L256) |      |      |        |            |      |
| $H*{gasLimit} > P(H)*{H*{gasLimit'}} - floor(\frac{P(H)*{H\_{gasLimit'}}}{1024} ) $ | ''                                                                                                                                                                                    |      |      |        |            |      |
| $H_{gasLimit} > 5000$                                                               | calculate_base_fee_per_gas -> [check_gas_limit](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L1132)          |      |      |        |            |      |
| $H*{timeStamp} > PH)*{H\_{timeStamp'}} $                                            | validate_header-> [ensure](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L323)                                |      |      |        |            |      |
| $H_{numberOfAncestors} = PH)_{H_{numberOfAncestors'}} + 1 )$                        | validate_header-> [ensure](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L324)                                |      |      |        |            |      |
| $length(H*{extraData}) \leq 32*{bytes} $                                            | validate_header-> [ensure](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L325)                                |      |      |        |            |      |
| $H\_{baseFeePerGas} = F(H) $                                                        |                                                                                                                                                                                       |      |      |        |            |      |
| $H\_{parentHash} = KEC(RLP( P(H)\_H )) $                                            | validate_header-> [ensure](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L332)                                |      |      |        |            |      |
| $H\_{ommersHash} = KEC(RLP(())) $                                                   | validate_header-> [ensure](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L329)                                |      |      |        |            |      |
| $H\_{difficulty} = 0 $                                                              | validate_header-> [ensure](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L327)                                |      |      |        |            |      |
| $H\_{nonce} = 0x0000000000000000 $                                                  | validate_header-> [ensure](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L328)                                |      |      |        |            |      |
| $H\_{prevRandao} = PREVRANDAO() $ (this is stale , beacon chain provides this now)  |                                                                                                                                                                                       |      |      |        |            |      |
| $H\_{withdrawalHash} \neq nil $                                                     |                                                                                                                                                                                       |      |      |        |            |      |
| $H\_{blobGasUsed} \neq nil $                                                        |                                                                                                                                                                                       |      |      |        |            |      |
| $H*{blobGasUsed} \leq MaxBlobGasPerBlock*{=786432} $                                |                                                                                                                                                                                       |      |      |        |            |      |
| $H*{blobGasUsed} \% GasPerBlob*{=2^{17}} = 0 $                                      |                                                                                                                                                                                       |      |      |        |            |      |
| $H\_{excessBlobGas} = CalcExcessBlobGas(P(H)\_H) $                                  | [ensure](https://github.com/ethereum/execution-specs/blob/9fc7925c80ff2f3949e1cc340a4a0d36fcd4161c/src/ethereum/cancun/fork.py#L187)                                                  |      |      |        |            |      |

### 下载器

### 交易池

以太坊中主要有两种类型的交易池：

1. **Legacy 池**：由 Geth 管理，这些池使用基于价格排序的堆或优先队列来组织交易。具体来说，交易使用两个堆来组织：一个优先考虑即将到来的区块的有效小费，另一个关注 gas 费用上限。在交易池饱和期间，会选择这两个堆中较大的一个来驱逐交易，从而优化池的效率和响应性。[紧急和浮动堆(urgent and floating heaps)](https://github.com/ethereum/go-ethereum/blob/064f37d6f67a012eea0bf8d410346fb1684004b4/core/txpool/legacypool/list.go#L525)

2. **Blob 池**：与传统池不同，blob 池维护一个采用不同机制剔除交易的优先堆。值得注意的是，blob 池的实现有详细的文档，可以在[这里](https://github.com/ethereum/go-ethereum/blob/064f37d6f67a012eea0bf8d410346fb1684004b4/core/txpool/blobpool/blobpool.go#L132)查看详细的注释说明。blob 池的一个关键特征是在其驱逐队列中使用对数函数。

### EVM

[Wiki - EVM](/wiki/EL/evm.md)
TODO: 将规范中的相关代码移至 EVM

### DevP2P

[Wiki - DevP2P](/wiki/EL/devp2p.md)

### 数据结构

更多详情请参见[执行层数据结构](/wiki/EL/data-structures.md)页面。

### 存储

执行客户端处理的区块链和状态数据需要存储在磁盘上。这些数据对于验证新区块、验证历史记录以及为网络中的对等节点提供服务都是必需的。客户端存储历史数据(也称为远古数据库)，其中包括以前的区块。另一个具有 trie 结构的数据库包含当前状态和少量最近的状态。实际上，客户端为不同的数据类别维护各种数据库。每个客户端可以实现不同的后端来处理这些数据，例如 leveldb、pebble、mdbx。

**Leveldb**

TODO

**Pebble**

TODO

**MDBX**

阅读更多关于其[特性](https://github.com/erthink/libmdbx#features)的信息。此外，boltdb 有一个与其他数据库(如 leveldb)的比较页面，[在这里](https://github.com/etcd-io/bbolt#comparison-with-other-databases)。bolt 中提到的比较要点也适用于 mdbx。
