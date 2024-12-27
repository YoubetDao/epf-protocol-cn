# 交易剖析

**交易** 是由 **外部账户** 发布的经过加密签名的指令，通过 [JSON-RPC](/wiki/EL/JSON-RPC.md) 广播到整个网络。

交易包含以下字段：

- **nonce ($T_n$)**: 一个整数值，等于发送方已发送交易的数量。Nonce 的用途包括：
  - **防止重放攻击**：假设 Alice 向 Bob 发送 1 ETH 的交易，Bob 可能试图将相同的交易重新广播到网络中，从 Alice 的账户中获取额外的资金。由于交易使用了唯一的 nonce，如果 Bob 再次发送，EVM 将直接拒绝交易，从而保护 Alice 的账户免受未经授权的重复交易。
  - **确定合约账户地址**：在 `合约创建` 模式下，nonce 和发送者地址一起用于确定合约账户地址。
  - **替换交易**：当交易因低 Gas 费卡住时，矿工通常允许用相同 nonce 的交易替换原交易。一些钱包可能提供取消交易的选项，这本质上是发送一个新的交易，其具有相同的 nonce、更高的 Gas 价格和 0 的数值，从而覆盖原来的待处理交易。然而，替换交易的成功并不保证，因为这取决于矿工的行为和网络条件。

- **gasPrice ($T_p$)**: 一个整数值，表示每单位 Gas 支付的 Wei 数量。**Wei** 是以太坊中最小的单位。$1  \textnormal{ETH} = 10^{18} \textnormal{Wei}$。Gas 价格用于决定交易的执行优先级。Gas 价格越高，交易越有可能被矿工优先打包进区块。

- **gasLimit ($T_g$)**: 一个整数值，表示该交易执行时允许使用的最大 Gas 数量。如果执行过程中 Gas 超过了 gasLimit，交易将被停止。

- **to ($T_t$)**: 交易接收方的 20 字节地址。`to` 字段还决定了交易的模式或用途：

| `to` 的值       | 交易模式              | 描述                                                       |
| ---------------- | --------------------- | --------------------------------------------------------- |
| _空_             | 合约创建模式          | 该交易用于创建一个新的合约账户。                           |
| 外部账户         | 价值转移              | 该交易用于向一个外部账户转移以太币。                       |
| 合约账户         | 合约执行              | 该交易用于调用现有的智能合约代码。                         |

- **value ($T_v$)**: 一个整数值，表示转移到此交易接收方的 Wei 数量。在 `合约创建` 模式下，value 是新创建合约账户的初始余额。

- **data ($T_d$) 或 init($T_i$)**: 一个无限大小的字节数组，指定 EVM 的输入。在 `合约创建` 模式下，此值被视为 `初始化字节码`，否则是 `输入数据` 的字节数组。

- **Signature ($T_v, T_r, T_s$)**: [ECDSA](/wiki/Cryptography/ecdsa.md) 签名，由发送方提供。

---

## 合约创建

让我们将以下代码部署到一个新的合约账户：

```bash
[00] PUSH1 06 // 推入 06
[02] PUSH1 07 // 推入 07
[04] MUL      // 乘法
[05] PUSH1 0  // 推入 00 (存储地址)
[07] SSTORE   // 将结果存储到存储槽 00
```

括号内的数字表示指令的偏移量。对应的字节码：

```bash
6006600702600055
```

现在，让我们准备交易的 `init` 值，以部署这个字节码。实际上，`init` 由两个片段组成：

```
<init bytecode> <runtime bytecode>
```

`init` 仅在账户创建时由 EVM 执行一次。`init` 代码执行的返回值是 **runtime bytecode**，它存储为合约账户的一部分。每次合约账户收到交易时，都会执行 runtime bytecode。

让我们准备我们的 `init` 代码，使其返回我们的 runtime 代码：

```bash
// 1. Copy to memory
[00] PUSH1 08 // PUSH1 08 (length of our runtime code)
[02] PUSH1 0c // PUSH1 0c (offset of the runtime code in init)
[04] PUSH1 00 // PUSH1 00 (destination in memory)
[06] CODECOPY // Copy code running in current environment to memory
// 2. Return from memory
[07] PUSH1 08 // PUSH1 08 (length of return data)
[09] PUSH1 00 // PUSH1 00 (memory location to return from)
[0b] RETURN   // Return the runtime code and halt execution
// 3. Runtime code (8 bytes long)
[0c] PUSH1 06
[0e] PUSH1 07
[10] MUL
[11] PUSH1 0
[13] SSTORE
```

这段代码做了两件简单的事情：首先，将 runtime 字节码复制到内存中，然后从内存中返回 runtime 字节码。

`init` 字节码：

```javascript
6008600c60003960086000f36006600702600055
```

接下来，准备交易的 payload：

```javascript
[
  "0x", // nonce (zero nonce, since first transaction)
  "0x77359400", // gasPrice (we're paying 2000000000 wei per unit of gas)
  "0x13880", // gasLimit (80000 is standard gas for deployment)
  "0x", // to address (empty in contract creation mode)
  "0x05", //value (we'll be nice and send 5 wei to our new contract)
  "0x6008600c60003960086000f36006600702600055", // init code
];
```

> payload 的排列需要遵循特定的顺序。

对于这个例子，我们将使用 [Foundry](https://getfoundry.sh/) 在本地部署交易。Foundry 是一个以太坊开发工具包，提供了以下命令行工具：

- **Anvil** : 一个本地以太坊节点，专为开发场景设计。
- **Cast**: 一个用于执行以太坊 RPC 调用的工具。

安装并启动 [anvil](https://book.getfoundry.sh/anvil/) 本地节点。

```
$ anvil


                             _   _
                            (_) | |
      __ _   _ __   __   __  _  | |
     / _` | | '_ \  \ \ / / | | | |
    | (_| | | | | |  \ V /  | | | |
     \__,_| |_| |_|   \_/   |_| |_|

    0.2.0 (5c3b075 2024-03-08T00:17:08.007462509Z)
    https://github.com/foundry-rs/foundry

Available Accounts
==================

(0) "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" (10000.000000000000000000 ETH)
.....

Private Keys
==================

(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
.....
Listening on 127.0.0.1:8545
```

使用 anvil 的 dummy 账户签署交易：

```bash
$ node sign.js '[ "0x", "0x77359400", "0x13880", "0x", "0x05", "0x6008600c60003960086000f36006600702600055" ]' ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

f864808477359400830138808005946008600c60003960086000f360066007026000551ca01446316c9bdcbe0cb87fac0b08a00e59552634c96d0d6e2bd522ea0db827c1d0a0170680b6c348610ef150c1b443152214203c7f66288ea6332579c0cdfa86cc3f
```

> 请参阅 **附录 A** 以获取 `sign.js` 辅助脚本。

最后，使用 [cast](https://book.getfoundry.sh/cast/) 提交交易：

```javascript
$ cast publish f864808477359400830138808005946008600c60003960086000f360066007026000551ca01446316c9bdcbe0cb87fac0b08a00e59552634c96d0d6e2bd522ea0db827c1d0a0170680b6c348610ef150c1b443152214203c7f66288ea6332579c0cdfa86cc3f

{
  "transactionHash": "0xdfaf2817f19963846490b330ae33eba7b42872e8c8bd111c8d7ea3846c84cd51",
  "transactionIndex": "0x0",
  "blockHash": "0xfde1475a716583d847f858c5db3e54156983b39e3dbefaa5829416e6e60a788a",
  "blockNumber": "0x1",
  "from": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "to": null,
  "cumulativeGasUsed": "0xd67e",
  "gasUsed": "0xd67e",
  // Newly created contract address 👇
  "contractAddress": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  "logs": [],
  "status": "0x1",
  "logsBloom": "0x0...",
  "effectiveGasPrice": "0x77359400"
}
```

查询本地 `anvil` 节点确认代码已部署：

```bash
$ cast code 0x5fbdb2315678afecb367f032d93f642f64180aa3
0x6006600702600055
```

初始余额可用：

```bash
$ cast balance 0x5fbdb2315678afecb367f032d93f642f64180aa3
5
```

---

下图模拟了合约创建的过程：

![Contract creation](images/evm/create-contract.gif)

## 合约代码执行

我们部署的这个简单合约功能是将 6 和 7 相乘并把结果保存到存储槽 0。现在让我们发送一笔交易来执行这个合约。

这笔交易的 payload 结构和之前类似，但有几点不同：`to` 字段需要填入我们刚才部署的智能合约地址，而 `value` 和 `data` 字段则留空：

```javascript
[
  "0x1", // nonce (increased by 1)
  "0x77359400", // gasPrice (we're paying 2000000000 wei per unit of gas)
  "0x13880", // gasLimit (80000 is standard gas for deployment)
  "0x5fbdb2315678afecb367f032d93f642f64180aa3", // to address ( address of our smart contract)
  "0x", // value (empty; not sending any ether)
  "0x", // data (empty)
];
```

对交易进行签名：

```bash
$ node sign.js '[ "0x1", "0x77359400", "0x13880", "0x5fbdb2315678afecb367f032d93f642f64180aa3", "0x", "0x"]' ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

f86401847735940083013880945fbdb2315678afecb367f032d93f642f64180aa380801ba047ae110d52f7879f0ad214784168406f6cbb6e72e0cab59fa4df93da6494b578a02c72fcdea5b7838b520664186707d1465596e4ad4eaf8781a721530f8b8dd5f2
```

发布交易：

```bash
$ cast publish f86401847735940083013880945fbdb2315678afecb367f032d93f642f64180aa380801ba047ae110d52f7879f0ad214784168406f6cbb6e72e0cab59fa4df93da6494b578a02c72fcdea5b7838b520664186707d1465596e4ad4eaf8781a721530f8b8dd5f2

{
  "transactionHash": "0xc82a658b947c6083de71a0c587322e8335448e65e7310c04832e477558b2b0ef",
  "transactionIndex": "0x0",
  "blockHash": "0x40dc37d9933773598094ec0147bef5dfe72e9654025bfaa80c4cdbf634421384",
  "blockNumber": "0x2",
  "from": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "to": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  "cumulativeGasUsed": "0xa86a",
  "gasUsed": "0xa86a",
  "contractAddress": null,
  "logs": [],
  "status": "0x1",
  "logsBloom": "0x0...",
  "effectiveGasPrice": "0x77359400"
}
```

使用 cast 读取存储槽 **0** 的值：

```bash
$ cast storage 0x5fbdb2315678afecb367f032d93f642f64180aa3 0x
0x000000000000000000000000000000000000000000000000000000000000002a
```

果然，结果正是 [42](<https://simple.wikipedia.org/wiki/42_(answer)>) (0x2a) 🎉。

---

合约执行的模拟：

![合约执行](images/evm/contract-execution.gif)

## 附录 A：交易签名器

`signer.js`：一个用于签署交易的简单 [node.js](https://nodejs.org/) 脚本。请看注释中的说明：

```javascript
/**
 * 用于签署交易 payload 数组的工具脚本。
 * 用法：node sign.js '[payload]' [private key]
 */

const { rlp, keccak256, ecsign } = require("ethereumjs-util");

// 解析命令行参数
const payload = JSON.parse(process.argv[2]);
const privateKey = Buffer.from(process.argv[3].replace("0x", ""), "hex");

// 验证私钥长度
if (privateKey.length != 32) {
  console.error("私钥必须是64个字符长！");
  process.exit(1);
}

// 第1步：将 payload 编码为 RLP 格式
// 了解更多：https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/
const unsignedRLP = rlp.encode(payload);

// 第2步：对 RLP 编码后的 payload 进行哈希
// 了解更多：https://ethereum.org/en/glossary/#keccak-256
const messageHash = keccak256(unsignedRLP);

// 第3步：签名消息
// 了解更多：https://epf.wiki/#/wiki/Cryptography/ecdsa
const { v, r, s } = ecsign(messageHash, privateKey);

// 第4步：将签名附加到 payload
payload.push(
  "0x".concat(v.toString(16)),
  "0x".concat(r.toString("hex")),
  "0x".concat(s.toString("hex"))
);

// 第5步：输出 RLP 编码后的已签名交易
console.log(rlp.encode(payload).toString("hex"));
```

## 更多资源
- 📝 Gavin Wood, ["Ethereum Yellow Paper."](https://ethereum.github.io/yellowpaper/paper.pdf)
- 📘 Andreas M. Antonopoulos, Gavin Wood, ["Mastering Ethereum."](https://github.com/ethereumbook/ethereumbook)
- 📝 Ethereum.org, ["RLP Encoding."](https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/)
- 📝 Ethereum.org, ["Transactions."](https://ethereum.org/en/developers/docs/transactions/)
- 📝 Random Notes, ["Signing transactions the hard way."](https://lsongnotes.wordpress.com/2018/01/14/signing-an-ethereum-transaction-the-hard-way/) • [archived](https://web.archive.org/web/20240229045603/https://lsongnotes.wordpress.com/2018/01/14/signing-an-ethereum-transaction-the-hard-way/)
- 🎥 Lefteris Karapetsas, ["Understanding Transactions in EVM-Compatible Blockchains."](https://archive.devcon.org/archive/watch/6/understanding-transactions-in-evm-compatible-blockchains-powered-by-opensource/?tab=YouTube)
- 🎥 Austin Griffith, ["Transactions - ETH.BUILD."](https://www.youtube.com/watch?v=er-0ihqFQB0)
- 🧮 Paradigm, ["Foundry: Ethereum development toolkit."](https://github.com/foundry-rs/foundry)