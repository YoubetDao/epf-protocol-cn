# JSON-RPC

JSON-RPC 规范是一种基于[OpenRPC](https://open-rpc.org/getting-started)的、使用 JSON 编码的远程过程调用协议。它允许在服务器上远程调用函数，并返回结果。

它是执行 API 规范的一部分，该规范提供了一套与以太坊区块链交互的方法。

更为人所熟知的是，该规范阐述了用户如何通过客户端与网络进行交互，以及共识层（CL）与执行层（EL）如何通过引擎 API 相互作用的方式。

本节将详细介绍 JSON-RPC 方法。

## API 规范

JSON-RPC 方法按照指定为方法前缀的命名空间进行分组。尽管它们各有不同的用途，但所有方法都共享一个通用结构，并且在所有实现中必须表现出相同的行为：

```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "method": "<prefix_methodName>",
  "params": [...]
}
```

其中：

- `id`: 请求的唯一标识符。
- `jsonrpc`: JSON-RPC 协议的版本。
- `method`: 将要调用的方法。
- `params`: 方法的参数。如果该方法不需要任何参数，它可以是一个空数组。其他参数如果没有提供，可能会有默认值。

### 命名空间

每个方法由一个命名空间前缀和方法名称组成，二者之间用下划线分隔。

以太坊客户端必须实现规范所要求的基本 RPC 方法集，以便与区块链网络进行交互。此外，还有一些特定于客户端的方法，用于控制节点或实现额外的独特功能。请始终参阅客户端文档，查看可用的方法和命名空间。例如，请注意 [Geth](https://geth.ethereum.org/docs/interacting-with-geth/rpc) 和 [Reth](https://paradigmxyz.github.io/reth/jsonrpc/intro.html) 文档中不同命名空间的区别。

以下是一些常见命名空间的示例：

| **命名空间** | **描述**                                                         | **敏感性** |
| ------------ | ---------------------------------------------------------------- | ---------- |
| eth          | eth API 允许你与以太坊进行交互。                                 | 可能       |
| web3         | web3 API 为 web3 客户端提供实用功能。                            | 否         |
| net          | net API 提供节点网络信息访问能力。                               | 否         |
| txpool       | txpool API 允许你检查交易池。                                    | 否         |
| debug        | debug API 提供多种方法来检查以太坊状态，包括 Geth 风格的追踪。   | 否         |
| trace        | trace API 提供多种方法来检查以太坊状态，包括 Parity 风格的追踪。 | 否         |
| admin        | admin API 允许你配置自己的节点。                                 | 是         |
| rpc          | rpc API 提供关于 RPC 服务器及其模块的信息。                      | 否         |

“敏感性”意味着接口可以用来设置节点，比如 _admin_，或访问存储在节点中的账户数据，就像 _eth_ 那样。

现在，让我们来看看一些方法，了解它们是如何构建的以及它们的作用：

#### Eth

Eth 可能是最常用的命名空间，它提供了对以太坊网络的基本访问，例如，钱包需要使用它来读取余额和创建交易。
这里只列出了一些方法，完整的列表可以在 [Ethereum JSON-RPC specification](https://ethereum.github.io/execution-apis/api-documentation/) 中找到。

| **方法**                             |            **参数**             | **描述**                                                                                                                                    |
| ------------------------------------ | :-----------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| eth_blockNumber                      |           无必须参数            | returns the number of the most recent block                                                                                                 |
| eth_call                             |       transaction object        | executes a new message call immediately without creating a transaction on the block chain                                                   |
| eth_chainId                          |           无必须参数            | returns the current chain id                                                                                                                |
| eth_estimateGas                      |       transaction object        | makes a call or transaction, which won't be added to the blockchain and returns the used gas, which can be used for estimating the used gas |
| eth_gasPrice                         |           无必须参数            | returns the current price per gas in wei                                                                                                    |
| eth_getBalance                       |      address, block number      | returns the balance of the account of the given address                                                                                     |
| eth_getBlockByHash                   |      block hash, full txs       | returns information about a block by hash                                                                                                   |
| eth_getBlockByNumber                 |     block number, full txs      | returns information about a block by block number                                                                                           |
| eth_getBlockTransactionCountByHash   |           block hash            | returns the number of transactions in a block from a block matching the given block hash                                                    |
| eth_getBlockTransactionCountByNumber |          block number           | returns the number of transactions in a block from a block matching the given block number                                                  |
| eth_getCode                          |      address, block number      | returns code at a given address in the blockchain                                                                                           |
| eth_getLogs                          |          filter object          | returns an array of all logs matching a given filter object                                                                                 |
| eth_getStorageAt                     | address, position, block number | returns the value from a storage position at a given address                                                                                |

| **方法**                             |            **参数**             | **描述**                                                                       |
| ------------------------------------ | :-----------------------------: | ------------------------------------------------------------------------------ |
| eth_blockNumber                      |           无必须参数            | 返回最新区块的编号                                                             |
| eth_call                             |       transaction object        | 立即执行一个新的消息调用，不在区块链上创建交易                                 |
| eth_chainId                          |           无必须参数            | 返回当前链的 ID                                                                |
| eth_estimateGas                      |       transaction object        | 执行一个调用或交易，不会添加到区块链上，并返回使用的 gas，可用于估算消耗的 gas |
| eth_gasPrice                         |           无必须参数            | 返回当前每单位 gas 的价格，以 wei 为单位                                       |
| eth_getBalance                       |      address, block number      | 返回给定地址的账户余额                                                         |
| eth_getBlockByHash                   |      block hash, full txs       | 通过区块哈希返回区块信息                                                       |
| eth_getBlockByNumber                 |     block number, full txs      | 通过区块编号返回区块信息                                                       |
| eth_getBlockTransactionCountByHash   |           block hash            | 通过区块哈希返回指定区块的交易数量                                             |
| eth_getBlockTransactionCountByNumber |          block number           | 通过区块编号返回指定区块的交易数量                                             |
| eth_getCode                          |      address, block number      | 返回区块链中指定地址处的代码                                                   |
| eth_getLogs                          |          filter object          | 返回与给定过滤器对象匹配的所有日志的数组                                       |
| eth_getStorageAt                     | address, position, block number | 返回指定存储位置的值                                                           |

#### Debug

_debug_ 命名空间提供了一些方法来检查以太坊的状态。通过它可以直接访问原始数据，这对于某些用例（如区块浏览器或研究目的）可能是必需的。这些方法中的一些可能需要在节点上进行大量计算，而在非存档节点上请求历史状态通常是不可行的。因此，公共 RPC 的提供者通常会限制这个命名空间或只允许安全的方法。这些方法中有些可能需要在节点上进行大量的计算，而且在非存档节点上查询历史状态多数情况下是不可行的。因此，公共 RPC 的提供者通常对这一命名空间加以限制，或只允许使用安全的方法。

以下是调试方法的基本示例：

| **方法**                 |   **参数**   | **描述**                               |
| ------------------------ | :----------: | -------------------------------------- |
| debug_getBadBlocks       |  无必须参数  | 返回客户端最近看到的坏区块的数组       |
| debug_getRawBlock        | block_number | 返回一个 RLP 编码的区块                |
| debug_getRawHeader       | block_number | 返回一个 RLP 编码的头                  |
| debug_getRawReceipts     | block_number | 返回一个 EIP-2718 二进制编码的收据数组 |
| debug_getRawTransactions |   tx_hash    | 返回一个 EIP-2718 二进制编码的交易数组 |

#### Engine

[Engine API](https://hackmd.io/@danielrachi/engine_api) 与上述方法不同。客户端在一个不同的、经过认证的端点上提供 Engine API，而不是普通的 http JSON RPC，因为它不是面向用户的 API。它主要用于共识层与执行层客户端之间的连接，基本上是一个内部节点通信过程。客户端之间的通信涉及关于共识、分叉选择、区块验证等信息的交换：

| **方法**                                 |               **参数**               | **描述**                         |
| ---------------------------------------- | :----------------------------------: | -------------------------------- |
| engine_exchangeTransitionConfigurationV1 |       Consensus client config        | 交换客户端配置                   |
| engine_forkchoiceUpdatedV1\*             | forkchoice_state, payload attributes | 更新分叉选择状态                 |
| engine_getPayloadBodiesByHashV1\*        |          block_hash (array)          | 给定区块哈希返回对应的执行负载体 |
| engine_getPayloadV1\*                    | forkchoice_state, payload attributes | 从负载构建过程中获取执行负载     |
| debug_newPayloadV1\*                     |               tx_hash                | 返回执行负载验证                 |

那些标有星号（\*）的方法具有多个版本，[Ethereum JSON-RPC specification](https://ethereum.github.io/execution-apis/api-documentation/) 提供了详细的描述。

## 编码

JSON-RPC 方法的参数编码遵循十六进制编码的约定。

- 数量使用 "0x" 前缀表示为十六进制值。
  - 例如，数字 65 表示为 "0x41"。
  - 数字 0 表示为 "0x0"。
  - 一些无效的用法包括 "0x" 和 "ff"。前者没有后续数字，后者没有以 "0x" 前缀。
- 未格式化的数据，如哈希值、账户地址或字节数组，也使用“0x”前缀进行十六进制编码。
  - 例如：0x400（十进制中为 1014）
  - 一个无效的例子是 0x400，因为不允许前导零。

## 传输协议无关

值得一提的是，JSON-RPC 是传输协议无关的，这意味着它可以使用任何传输协议，如 HTTP、WebSockets (WSS)，甚至进程间通信 (IPC)。传输协议之间的差异总结如下：

- **HTTP** 传输提供单向的响应-请求模型，发送响应后连接会被关闭。
- **WSS** 是双向协议，这意味着连接会一直保持，直到节点或用户显式关闭。支持基于订阅的模型通信，如事件驱动交互。
- **IPC** 传输协议用于同一台机器上运行的进程之间的通信。它比 HTTP 和 WSS 更快，但不适合远程通信，例如，可以通过本地 JS 控制台使用。

## 工具使用

有多种方法可以使用 JSON-RPC 方法。其中一种是使用 `curl` 命令。例如，要获取最新的区块编号，可以使用以下命令：

```bash
curl <node-endpoint> \
-X POST \
-H "Content-Type: application/json" \
-d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

请注意，_params_ 字段为空，因为方法默认传递 "latest" 作为值。

另一种方法是使用 Javascript/TypeScript 中的 `axios` 库。例如，要获取地址余额，可以使用以下代码：

```typescript
import axios from "axios";

const node = "<node-endpoint>";
const address = "<address>";

const response = await axios.post(node, {
  jsonrpc: "2.0",
  method: "eth_getBalance",
  params: [address, "latest"],
  id: 1,
  headers: {
    "Content-Type": "application/json",
  },
});
```

如你所见，JSON-RPC 方法在 POST 请求中，参数在请求体中传递。
这是客户端和服务器之间使用 OSI 的应用层协议（HTTP 协议）交换数据的一种不同方式。

无论哪种方式，与以太坊网络交互的最常见方法是使用 web3 库，例如 web3py 用于 python 或 web3.js/ethers.js 用于 JS/TS：

#### web3py

```python
from web3 import Web3

# Set up HTTPProvider
w3 = Web3(Web3.HTTPProvider('http://localhost:8545'))

# API
w3.eth.get_balance('0xaddress')
```

#### ethers.js

```typescript
import { ethers } from "ethers";

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

await provider.getBlockNumber();
```

通常，所有的 web3 库都会封装 JSON-RPC 方法，提供一种更友好的方式与执行层进行交互。可以根据偏好的编程语言查看相关信息，因为不同语言的语法可能会有所不同。

### 进一步阅读

- [Ethereum JSON-RPC Specification](https://ethereum.github.io/execution-apis/api-documentation/)
- [Execution API Specification](https://github.com/ethereum/execution-apis/tree/main)
- [JSON-RPC | Infura docs](https://docs.infura.io/api/networks/ethereum/json-rpc-methods)
- [reth book | JSON-RPC](https://paradigmxyz.github.io/reth/jsonrpc/intro.html)
- [OpenRPC](https://open-rpc.org/getting-started)
