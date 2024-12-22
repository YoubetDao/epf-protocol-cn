# 区块构建

## 介绍

区块构建是以太坊区块链功能中的关键任务，涉及多个流程，这些流程决定了验证者如何获取区块并进行提议。

以太坊网络由运行互联共识客户端（CL）和执行客户端（EL）的节点组成，这两者对参与网络和在每个时间槽中生成区块都是不可或缺的。

执行客户端（EL）具有许多重要功能，你可以通过学习 `[el-architecture](https://epf.wiki/#/wiki/EL/el-architecture)` 来深入了解, 本文的重点是介绍其为共识客户端（CL）构建区块的角色。

当一个验证者在某个 Slot 时间槽中被选中提议出块时，它会寻找由共识客户端（CL）生成的区块。值得注意的是，验证者并不限于广播自己 EL 生成的区块，也可以广播由外部构建者生成的区块；详情请参阅 [PBS](https://ethereum.org/en/roadmap/pbs/)。

本文特别探讨了 执行客户端（EL）如何生成区块，以及哪些要素影响着区块的成功生成和交易执行。

## Payload 构建流程

> 在以太坊中，Payload 通常是指由执行层（EL）生成的区块数据，包含了区块中的所有重要信息，如交易数据、状态根（state root）、交易根（transaction root）、收据根（receipts root）等，用于确保区块的有效性和完整性，会被传递到共识层（CL）进行验证和传播

当共识层通过 `engine API's fork choice updated` 端点指示执行层客户端时，区块就被创建了，然后通过 payload building routine 启动区块构建过程。

> 在以太坊中，共识层（CL）通过分叉选择规则（fork choice rule） 来决定在存在多个区块链（或分叉）时，哪条链被认为是有效链的逻辑，尤其是在网络分裂或同时产生多个区块的情况下。
>
> `engine API's fork choice updated` 端点 是指以太坊协议中的一个特定 API 端点，允许执行层（EL）做出决定，选择哪条分叉链应该被视为有效链。
>
> 当一个验证者被选中提议区块时，通过 engine API 调用 fork choice updated 端点，通知执行层当前的最佳链。这一操作有助于决定接下来应该构建哪一个区块，确保执行层在正确的链分支上工作，并根据这个分支构建新的区块

**注:** 费用接收者可能与预期的接收者不同，在正常情况下，区块中规定了一个建议的费用接收者地址，但在某些情况下，实际构建区块时，所选定的费用接收者地址可能与建议的地址不同。例如，如果某个外部构建者（external builder）参与了区块的构建过程，他们可能会选择将费用发送给其他地址，而不是建议的接收者地址

![](./images/el-architecture/architecture-overview.png)

节点通过 P2P 点对点网络传播交易。这些交易被认为是有效的，但尚未被包含在区块中。
交易的有效性主要指以下条件：交易的 nonce 是账户的下一个有效 nonce，并且账户拥有足够的余额来覆盖交易费用。

有时，节点会被分配到生成区块的任务。共识层通过随机选择过程来确定每个 epoch 中哪个验证者来负责构建区块。
如果你的验证者被选中构建区块，你的共识层客户端将使用执行引擎的 `fork choice updated` 方法进行构建，并提供区块构建所需的上下文。

---
## 代码分析

我们可以简化并模拟区块构建的过程，使用 Go 语言来完成一个简单的特定实现:

```go
func build(env environment, pool txpool.Pool, state state.StateDB) (types.Block, state.StateDB) {
    var (
        gasUsed = 0
        txs []types.Transactions
    )

    for ; gasUsed < 30_000_000 || !pool.Empty(); {
        transaction := pool.Pop()
        res, gas, err := vm.Run(env, transaction, state)
        if err != nil {
            // transaction invalid
            continue
        }
        gasUsed += gas
        transactions = append(transactions, transaction)
    }
    return core.Finalize(env, transactions, state)
}
```

1. 接收 3 个传参变量

- `env environment` 包含环境所有必要信息，包括时间戳、区块编号、前置区块、基础费用以及需要在区块中发生的所有提取操作, 这些信息本质上来源于共识层。
- 交易池 `txpool.Pool` 变量，即交易的集合，为简单起见，我们假设这些交易按其价值升序排列，价值越高的交易更容易被确认打包
- `state.StateDB` 状态数据库表示执行这些交易的状态存储

最后生成并返回以下内容:

- 一个完整的区块
- 一个包含所有交易的状态数据库（state DB），它记录了所有交易的执行结果和更新后的状态
- 如果在处理过程中出现了错误，还可能会返回一个错误信息

2. 在 build 函数中，我们跟踪 gas 消耗 `gasUsed`，因为我们可以使用的 gas 是有限的。我们还存储所有将被包含在区块中的交易。

3. 我们继续添加交易，直到交易池为空，或者消耗的 gas 超过 gas 限制。为了简单起见，在这个例子中，gas 限制设定为 3000 万（大约是主网当前的 gas 限制）。

4. 为了获取一笔交易，我们必须查询交易池，假设交易池会维护一个有序的交易列表，确保我们始终获取到下一个最有价值的交易。

5. 交易在 EVM 中执行，在执行交易时，系统将交易、环境和当前状态作为输入，并在这些输入条件下执行交易。交易的执行会根据当前环境（如区块链状态）进行，并在执行过程中更新状态数据库，包括所有已成功执行的交易

6. 如果交易执行失败，并且在执行过程中发生错误，我们将继续处理下一笔交易，而不立即中断。这表明该交易无效，并且由于区块中仍有未使用的 gas，我们不希望立即生成错误。因为在区块中尚未发生错误，因此我们可以继续进行处理。然而，很可能该交易是无效的，因为它在执行过程中发生了错误，或者交易池中的数据略有过时。在这种情况下，我们允许继续并尝试从交易池中获取下一笔交易，继续将其加入到当前区块中。

7. 一旦我们验证运行交易没有错误，我们就会将该交易添加到交易列表中，并将运行返回的气体添加到所使用的气体中。例如，如果第一笔交易是简单的转账，需要花费 21,000 Gas，那么我们使用的 Gas 将从 0 到 21,000，我们将继续执行此过程步骤 3-7，直到满足步骤 3 的条件

8. 我们通过获取一组交易和相关区块信息， 以最终确定生成一个完整的区块, 这样做的目的是为了最后进行一定的计算。由于 header 包含交易根、收据根和提款根，因此必须通过默克尔化列表来计算这些值并将其添加到块的 header 中

### Geth

以下示例使用 Geth 代码库来解释执行客户端如何构建区块信息:

1. 首先，当 validator 被选为 block builder 区块构建者时，它会通过执行客户端（EL）的 Engine Api 调用 `engine_forkchoiceUpdatedV3` 函数，然后开始进入区块构建的流程，底层会调用`forkchoiceUpdated` 函数。
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/eth/catalyst/api.go#L84
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/eth/catalyst/api.go#L238

2. 区块构建和交易执行的核心逻辑大部分位于 Geth 的 `miner` 模块中。`buildPayload` 函数最初创建一个空的区块，以确保节点不会错过时隙并有东西可以提议。
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/payload_building.go#L179
>
> 该函数的实现还启动了一个 go routine 进程，其任务是填充我们留下的空区块，并随后并发地用已填充的交易更新它。
>- https://github.com/ethereum/go-ethereum/blob/0a2f33946b95989e8ce36e72a88138adceab6a23/miner/payload_building.go#L204

3. 在 `buildPayload` 函数中，go routine 正在等待多个通信操作的“情况”，在第一种情况下，它调用 `generateWork`，并传入参数明确指定区块不应为空。请查看 `fullParams` 变量，即 `noTxs:False`。
>- https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/payload_building.go#L222

4. 在 `generateWork` 中，首先会调用 `miner/worker.go` 中的 `prepareWork` 方法构造任务, 这里待处理交易尚未填充，仅返回空任务
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/worker.go#L138

5. 交易填充到区块中实际是调用 `miner.fillTransactions` 方法
 > - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/worker.go#L103

6. `miner.fillTransactions` 函数从内存池中检索所有待处理交易并将其填充到区块中。这包括所有类型的交易，包括 blobs
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/worker.go#L396

7. 交易按费用顺序填充，并随后传递给 `commitTransactions` 函数
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/worker.go#L444

8. `commitTransactions` 函数检查每笔交易是否有足够的 gas 剩余，然后提交该交易。此外，每个区块允许的 blobs 数量是有限的，具体规定在 eip-4844 中
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/worker.go#L293
> - https://github.com/ethereum/EIPs/blob/master/EIPS/eip-4844.md

9.  如果查看 `commitTransaction` 函数，它会返回调用 `w.applyTransaction` 函数
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/worker.go#L372
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/worker.go#L244

10.  `applyTransaction` 函数接着会调用核心包并调用 `core.ApplyTransaction`，这会对本地执行层（EL）状态执行所有交易
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/miner/worker.go#L285

11.  `ApplyTransaction` 函数将在本地执行层（EL）状态上运行交易并执行所有状态变更。它创建 EVM 上下文和环境以在 EVM 中执行交易。所有的合约调用也都发生在这里。如果一切顺利，状态将成功过渡
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/core/state_processor.go#L195

12. 此外，交易可能会失败。如果交易失败，它不会应用到状态过渡中。它可能因为链上原因失败，例如 gas 耗尽、合约调用失败等
```go
receipt, err := core.ApplyTransaction(env.evm, env.gasPool, env.state, env.header, tx, &env.header.GasUsed)
if err != nil {
    env.state.RevertToSnapshot(snap)
    env.gasPool.SetGas(gp)
}
```

13. 在此之后，所有交易将一一执行, 然后这些交易将被打包成一个区块数据放入队列
> - https://github.com/ethereum/go-ethereum/blob/release-1.14.9/eth/catalyst/api.go#L386

14. 共识层（CL）随后通过 Engine API 请求执行层（EL）获取已填充有效载荷的交易 `getPayload`。执行层（EL）返回这个有效载荷给共识层（CL），共识层将该有效载荷放入 beacon 区块并传播
>- https://github.com/ethereum/go-ethereum/blob/release-1.14.9/eth/catalyst/api.go#L458

## 引用资源

- [Block Building](https://epf.wiki/#/wiki/EL/block-production)
- [GETH codebase](https://github.com/ethereum/go-ethereum)
- [Engine API: A Visual Guide](https://hackmd.io/@danielrachi/engine_api)
