# 预编译合约
预编译合约是一组特殊账户，每个账户都包含一个内置函数，并具有确定的 gas 成本，这些函数通常与复杂的加密计算相关。目前，它们定义在地址范围 `0x01` 到 `0x0a` 之间

与普通的合约账户不同，预编译合约是以太坊协议的一部分，由[执行客户端](https://epf.wiki/#/wiki/EL/el-clients)实现。这导致一个有趣的特性：在 EVM 中，它们的 `EXTCODESIZE` 值为 0, 然而，它们在执行时表现得像带有代码的合约账户

根据 [EIP-2929](https://eips.ethereum.org/EIPS/eip-2929) 的定义，预编译合约被包括在交易的初始“已访问地址”中，以节省gas成本

## 预编译合约与操作码的比较

预编译合约和操作码的目标都是执行任意计算。在两者之间做出选择时，需要考虑以下因素:
- **有限的操作码空间**: EVM 的 1 字节操作码空间本质上是有限的（256 个操作码，范围 0x00 到 0xFF）, 这需要对必要操作进行谨慎分配
- **效率**: 预编译合约本质上在 EVM 外执行，从而实现了复杂加密计算的高效实现，这些计算支持许多跨链交互

引用 Vitalik 在["以太坊协议的前世今生"](https://vitalik.eth.limo/general/2017/09/14/prehistory.html)中的描述：
> "第二个是‘预编译合约’的概念，它解决了在 EVM 中使用复杂加密计算而无需处理 EVM 开销的问题。
> 我们还探讨过更具野心的想法，即‘原生合约’，即如果矿工能够为某些合约提供优化实现，他们可以“投票”降低这些合约的 gas 价格，这样大多数矿工能够更快执行的合约自然会拥有更低的 gas 价格；然而，这些想法最终被否决了，因为我们无法设计出一种加密经济学上安全的方式来实现这一点。攻击者总是可以创建一个执行某些带有后门的加密操作的合约，然后将后门分发给自己和朋友，让他们能够更快地执行此合约，再投票降低 gas 价格，并利用此方法对网络发动拒绝服务（DoS）攻击。相较之下，我们选择了一种目标较小的方式：在协议中简单地指定少量预编译合约，用于诸如哈希和签名方案等常见操作”

## 预编译合约列表
| 地址     | 名称             | 描述                                              | 引入版本     |
|---------|------------------|--------------------------------------------------|-------------|
| 0x01    | ECRECOVER        | 椭圆曲线公钥恢复                                 | Frontier    |
| 0x02    | SHA2-256         | SHA2 256 位哈希算法                              | Frontier    |
| 0x03    | RIPEMD-160       | RIPEMD 160 位哈希算法                            | Frontier    |
| 0x04    | IDENTITY         | 身份函数                                         | Frontier    |
| 0x05    | MODEXP           | 任意精度模幂运算                                 | Byzantium ([EIP-198](https://eips.ethereum.org/EIPS/eip-198))   |
| 0x06    | ECADD            | 椭圆曲线加法                                     | Byzantium ([EIP-196](https://eips.ethereum.org/EIPS/eip-196))  |
| 0x07    | ECMUL            | 椭圆曲线标量乘法                                 | Byzantium ([EIP-196](https://eips.ethereum.org/EIPS/eip-196))    |
| 0x08    | ECPAIRING        | 椭圆曲线配对检查                                 | Byzantium ([EIP-197](https://eips.ethereum.org/EIPS/eip-197))   |
| 0x09    | BLAKE2           | BLAKE2 压缩函数                                  | Istanbul ([EIP-152](https://eips.ethereum.org/EIPS/eip-152))    |
| 0x0a    | KZG POINT EVAL   | 验证 KZG 证明                                    | Cancun  ([EIP-4844](https://eips.ethereum.org/EIPS/eip-4844))     |

## 工作原理
预编译合约的优势在于其接口设计，这与外部智能合约调用相同, 从开发者的角度来看，使用预编译合约与调用外部合约没有区别

预编译合约的 gas 成本直接与输入数据相关 — 固定输入对应固定成本。开发者通过参考实现和基准测试来确定这些成本。基准测试通常在特定硬件上测量执行时间，而某些合约（如 MODEXP）则直接以[每秒的 gas 使用量](https://eips.ethereum.org/EIPS/eip-2565#1-modify-computational-complexity-formula-to-better-reflect-the-computational-complexity)来定义消耗, 这种严谨的方法旨在通过确保资源分配的可预测性来阻止拒绝服务（DoS）攻击

在底层实现中，客户端使用优化的库来执行预编译合约。虽然这提高了效率，但也引入了潜在的安全风险。如果这些库中存在漏洞，可能会破坏整个协议层，为了降低风险，严格的[测试](https://epf.wiki/#/wiki/testing/overview)是必不可少的（e.g: [MODEXP test specs](https://github.com/ethereum/execution-spec-tests/tree/main/tests/byzantium/eip198_modexp_precompile)）

为了防止漏洞，预编译合约的设计避免了嵌套调用

## 调用预编译
与合约账户类似，预编译合约可以使用 `CALL` 系列操作码进行调用

以下是一个使用 `SHA-256` 预编译合约来哈希字符串 "Hello" 的汇编代码示例:
```
PUSH5 0x48656C6C6F // Push "Hello" in UTF-8
PUSH1 0
MSTORE

PUSH1 0x20 // Output size
PUSH1 0x20 // Input size
PUSH1 5    // Input offset
PUSH1 0x1B // Address of SHA-256 precompile
PUSH1 2    // Gas limit
PUSH4 0xFFFFFFFF // Gas price
STATICCALL // Call the precompile

POP // Pop result from stack
PUSH1 0x20
MLOAD // Load the result from memory
```

生成以下哈希值：
```
185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969
```

> 在 [EVM playground](https://www.evm.codes/playground?fork=cancun&unit=Wei&codeType=Mnemonic&code=%27~FirsKplaceqparameters%20inYZ5948656C6C6FjHello%20in%20UTF-8w0vMSTOREvv~Call%20SHA-256%20precompilJ%7BV02%7DNSizeNW5QSizewV1BQW2jaddressZ49FFFFFFFFjgasvbPOPjPop_ofqb~LOAD_fromYGo%20stackXvMLOAD%27~%2F%2F%20wZ1%20v%5CnqGhJj%20~bSTATICCALLvv_qresulKZvPUSHY%20memoryXwV20WOffsetwV0xQjargsNXjretKt%20Je%20G%20t9%20V%019GJKNQVWXYZ_bjqvw~_) 中可以尝试以上试验

关于汇编代码是如何工作的, 可以参考: [EVM](./evm.md)

## 已提案的预编译合约
EIP 提案可以通过硬分叉引入新的预编译合约，然而，由于测试和维护负担的增加，人们通常对增加新的预编译合约持保留态度。

一种建议的方法是先在 Layer 2 解决方案上对预编译合约进行原型设计，只有在证明其稳定性和广泛采用之后，才将其集成到主网上。

以下是目前提出的预编译合约：
- [EIP-2537：用于 BLS12-381 曲线操作的预编译合约](https://eips.ethereum.org/EIPS/eip-2537)
- [EIP-7212：用于 secp256r1 曲线支持的预编译合约](https://eips.ethereum.org/EIPS/eip-7212)
- [EIP-7545：用于 Verkle 证明验证的预编译合约](https://eips.ethereum.org/EIPS/eip-7545)
- [EIP-5988：添加 Poseidon 哈希函数的预编译合约](https://eips.ethereum.org/EIPS/eip-5988)

引入新的预编译合约需要仔细评估其对网络的影响。 gas 成本计算不当的预编译合约可能会通过消耗超出预期的资源导致拒绝服务（DoS）攻击。此外，增加预编译合约的数量可能会导致 EVM 客户端中的代码膨胀，增加验证者的负担

选择预编译合约的密码学函数及其参数时必须在安全性和效率之间取得平衡。这些参数通常在预编译合约的逻辑中预先设定，因为允许用户定义的参数可能会带来安全风险。此外，为广泛的参数范围优化密码学函数对于实现快速执行来说是一个挑战，而快速执行是预编译合约的基础要求

## 移除预编译合约
目前正在讨论是否移除那些过时、使用率低或影响客户端软件效率的预编译合约。例如，Identity 预编译合约（已被 MCOPY 操作码取代）、RIPEMD-160 和某些 BLAKE 函数

与完全移除不同，这些预编译合约可以迁移到高效的智能合约实现中。这种方法可以确保功能的延续，但 gas 成本相应会增加

## 具体实现
- `Besu:` [org.hyperledger.besu.evm.precompile](https://github.com/hyperledger/besu/tree/3d5f45c35ffce4b5173b2ce5972827f9634317d6/evm/src/main/java/org/hyperledger/besu/evm/precompile)
- `Geth:` 实现在 [core/vm/contracts.go](https://github.com/ethereum/go-ethereum/blob/b2b0e1da8cac279bf0466885d1abdc5d93402f41/core/vm/contracts.go) 文件中
- `Nethermind:` 在 [Nethermind.EVM.Precompiles](https://github.com/NethermindEth/nethermind/tree/f3edf2503d2637a37f8b509924e10f88491ddd6e/src/Nethermind/Nethermind.Evm/Precompiles) 命名空间实现
- `Reth:` 实现在 [REVM Precompiles crates](https://github.com/bluealloy/revm/tree/1ca3d39f6a9e9778f8eb0fcb74fe529345a531b4/crates/precompile/src)

## 研究
一种被称为[“渐进式预编译合约”](https://ethereum-magicians.org/t/eip-proposal-create2-contract-factory-precompile-for-deployment-at-consistent-addresses-across-networks/6083/26) 的建议方法旨在改进部署流程。这些预编译合约将位于确定性的 CREATE2 地址上，允许用户合约与相同地址交互，无论预编译合约是否已在主网或特定的 Layer 2 解决方案上启用。这种方法可在原生客户端预编译合约可用时确保更顺畅的过渡。

## 引用资源
- [Appendix E: Ethereum Yellow Paper.](https://ethereum.github.io/yellowpaper/paper.pdf)
- [Week 10: Precompiles overview by Danno Ferrin](/eps/week10-dev.md)
- [Catalog of EVM Precompile](https://github.com/shemnon/precompiles/)
- [Go Ethereum Precompile Implementation.](https://github.com/ethereum/go-ethereum/blob/master/core/vm/contracts.go)
- [A Prehistory of the Ethereum Protocol](https://vitalik.eth.limo/general/2017/09/14/prehistory.html)
- [Stack Exchange: What's a precompiled contract and how are they different from native opcodes?](https://ethereum.stackexchange.com/questions/440/whats-a-precompiled-contract-and-how-are-they-different-from-native-opcodes)
- [Stack Exchange: Why aren't more common algorithms done as precompiles?](https://ethereum.stackexchange.com/questions/155787/why-arent-more-common-algorithms-done-as-precompiles)
- [A call, a precompile and a compiler walk into a bar](https://blog.theredguild.org/a-call-a-precompile-and-a-compiler-walk-into-a-bar/)