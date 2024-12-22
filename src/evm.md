# 以太坊虚拟机 (EVM)

以太坊虚拟机 (EVM) 是以太坊世界计算机的核心。它执行完成交易所需的计算，并将结果永久存储在区块链上。本文探讨了 EVM 在以太坊生态系统中的作用及其工作原理。

## 以太坊状态机

当 EVM 处理交易时，它会改变以太坊的整体状态。从这个角度来看，以太坊可以被视为一个**状态机**。

在计算机科学中，**状态机**是一个用于模拟系统行为的抽象概念。状态机可以用 组不同的状态以及驱动状态变化的输入来描述整个系统。

一个常见的例子是自动售货机，这是一个在收到付款后自动分发产品的系统。

我们可以将自动售货机建模为三种不同的状态：空闲、等待选择和分发产品。输入例如投币或选择会触发这些状态之间的转换，如下图所示：

![Vending machine](./images/evm/vending-machine.gif)

让我们正式定义状态机的组成部分：

1. **状态 ($S$)**: 状态表示系统在某一特定时间点的不同条件或配置。对于自动售货机，可能的状态有：

$$ S\in \\{空闲, 等待选择, 分发产品\\} $$

2. **输入 ($I$)**: 输入是系统环境中的动作、信号或变化。输入触发**状态转移函数**。对于自动售货机，可能的输入包括：

$$ I\in \\{投币, 选择, 取货\\} $$

3. **状态转移函数 ($\Upsilon$)**: 状态转移函数定义了系统如何基于输入和当前状态从一个状态转移到另一个状态（或回到同一个状态），这决定了系统如何响应输入。

$$\Upsilon (S,I) \Longrightarrow S'  $$

> 其中 $S'$ 是下一个状态，$S$ 是当前状态，$I$ 是输入。

状态转移示例：

$$\Upsilon (空闲,投币) \Longrightarrow 等待选择 $$
$$\Upsilon (等待选择,选择) \Longrightarrow 分发产品 $$
$$\Upsilon (空闲,选择) \Longrightarrow 空闲 $$

注意在最后一种情况下，当前状态会回到自身。

### 作为状态机的以太坊

整个以太坊系统可以被视为一个**基于交易的**状态机。它接收交易作为输入，并过渡到新的状态。以太坊的当前状态被称为**世界状态**。

让我们考虑一个简单的以太坊应用程序 —— 一个[NFT](https://ethereum.org/en/nft/)市场。

在当前世界状态 **S3**（绿色）中，Alice 拥有一个 NFT。动画显示了一个将 NFT 所有权转移给你的交易（**S3** ➡️ **S4**）。同样，将 NFT 再卖回给 Alice 会将其状态转移到 **S5**：

![Ethereum state machine](./images/evm/ethereum-state-machine.gif)

注意当前世界状态会被表示为 _跳动的绿色气泡_。

在上图中，每笔交易都会形成一个新的状态。而多笔交易会被打包到一个区块中，这个区块产生的最终状态会被添加到之前状态链条中。到这里，相信你已经明白为什么这项技术被称为"区块链"了。

根据状态转移函数的定义，我们得出以下结论：

> ℹ️ 注意
> **EVM 就是以太坊状态机的状态转移函数。它决定了以太坊如何根据输入（交易）和当前状态过渡到新的（世界）状态。**

在以太坊中，世界状态本质上是一个 20 字节地址到账户状态的映射。

![Ethereum world state](./images/evm/ethereum-world-state.jpg)

每个账户状态包含各种组件，例如存储、代码、余额等，并与其特定地址相关联。

Ethereum 有两种账户：

- **外部账户：** 由与其关联的私钥控制的账户，且其 EVM 代码为空。
- **合约账户：** 由与其关联的非空 EVM 代码控制的账户。这段 EVM 代码是合约的一部分，通常被称为 _智能合约_。

参考 [Ethereum 数据结构](/wiki/EL/data-structures.md) 了解更多关于世界状态实现的信息。

## 虚拟机范式

在我们理解了状态机的概念之后，下一个挑战是**实现它**。

软件需要转换为目标处理器的机器语言（指令集，ISA）才能执行。这种 ISA 因硬件而异（例如，Intel 与 Apple silicon）。现代软件还依赖主机操作系统进行内存管理和其他基本功能。

在由不同硬件和操作系统组成的分散生态系统中确保功能正常是一个主要挑战。传统上，软件必须为每个特定的目标平台编译成原生二进制文件：

![Platform dependent execution](./images/evm/platform-dependent-execution.jpg)

为了解决这个挑战，虚拟机采用的解决方案分为两个部分。

首先，讨论面向**虚拟机**这个抽象层的实现。虚拟机会将源代码被编译成**字节码**，这是一个表示指令的字节序列。每个字节码都映射到虚拟机执行的特定操作。

第二部分涉及特定平台的虚拟机，它将字节码转换为可执行的原生代码。

这提供了两个关键优势：可移植性（字节码可以在不同平台上运行而无需重新编译）和抽象性（将硬件复杂性与软件分离）。因此，开发人员只需要为单一的虚拟机编写代码：

![Virtual machine paradigm](./images/evm/virtual-machine-paradigm.jpg)

Java 的 [JVM](https://en.wikipedia.org/wiki/Java_virtual_machine) 和 Lua 的 LuaVM 是虚拟机的典型例子。它们创建平台无关的字节码，使代码能够在各种系统上运行而无需重新编译。

## EVM

虚拟机是计算机架构中的一个抽象概念，而以太坊虚拟机（EVM）是这个抽象的一个具体软件实现。下面描述了 EVM 的架构：

在计算机架构中，字（word）指的是 CPU 一次可以处理的固定大小的数据单元。EVM 的字大小为 **32 字节**。

![EVM anatomy](./images/evm/evm-anatomy.jpg)

_为了清晰起见，上图简化了以太坊状态。实际状态包括消息帧和临时存储等额外元素。_

在上述架构图中，可以看到 EVM 正在操作账户实例的存储、代码区和余额。

在实际场景中，EVM 可能会执行涉及多个账户的交易（每个账户都有独立的存储、代码和余额），从而实现以太坊上的复杂交互。

在更好地理解了虚拟机之后，让我们扩展我们的定义：

> ℹ️ 注意
> EVM 就是以太坊状态机的状态转移函数。它决定了以太坊如何根据输入（交易）和当前状态过渡到新的（世界）状态。**它被实现为虚拟机，因此可以在任何平台上运行，不依赖于底层硬件。**

## EVM bytecode

EVM 字节码是一个程序的表示形式，它是一个字节序列。每个字节码中的字节要么是：

- 一个称为 **操作码** 的指令，或者
- 一个称为 **操作数** 的操作码的输入。

![Binary bytecode](./images/evm/opcode-binary.jpg)

为了简洁起见，EVM 字节码通常用 [**十六进制**](https://en.wikipedia.org/wiki/Hexadecimal) 表示：

![Hexadecimal bytecode](./images/evm/opcode-hex.jpg)

为了进一步增强可读性，操作码有可读的助记符。这种简化的字节码被称为 **EVM 汇编**，是人类可读的最低层次的 EVM 代码表示形式：

![EVM Assembly](./images/evm/opcode-assembly.jpg)

区分操作数和操作码是很直观的。目前，只有 `PUSH*` 操作码有对应的操作数（这可能会随着 [EOF](https://eips.ethereum.org/EIPS/eip-7569) 的实施而改变）。`PUSHX` 通过 X 定义了操作数的长度（PUSH 操作码后的 X 字节）。

下面列出了本文中使用到的操作码：

| Opcode | Name     | Description                                        |
| ------ | -------- | -------------------------------------------------- |
| 60     | PUSH1    | Push 1 byte on the stack                           |
| 01     | ADD      | Add the top 2 values of the stack                  |
| 02     | MUL      | Multiply the top 2 values of the stack             |
| 39     | CODECOPY | Copy code running in current environment to memory |
| 51     | MLOAD    | Load word from memory                              |
| 52     | MSTORE   | Store word to memory                               |
| 53     | MSTORE8  | Store byte to memory                               |
| 59     | MSIZE    | Get the byte size of the expanded memory           |
| 54     | SLOAD    | Load word from storage                             |
| 55     | SSTORE   | Store word to storage                              |
| 56     | JUMP     | Alter the program counter                          |
| 5B     | JUMPDEST | Mark destination for jumps                         |
| f3     | RETURN   | Halt execution returning output data               |

请参考 [Yellow Paper 的附录 H](https://ethereum.github.io/yellowpaper/paper.pdf) 获取完整列表。

> ℹ️ 注意
> 可以通过 [EIPs](https://eips.ethereum.org/) 提出对 EVM 的修改。例如，[EIP-1153](https://eips.ethereum.org/EIPS/eip-1153) 引入了 `TSTORE` 操作码。

Ethereum 客户端（如 [geth](https://github.com/ethereum/go-ethereum)）实现了 [EVM 规范](https://github.com/ethereum/execution-specs)。这确保了所有节点在交易如何改变系统状态方面达成一致，从而在网络中创建了一个统一的执行环境。

我们已经讨论了**EVM 是什么**，现在让我们探索**它是如何工作**的。

## 栈(Stack)

栈是一种简单的数据结构，具有两个操作：**PUSH** 和 **POP**。Push 将一个项添加到栈顶，而 pop 则移除栈顶的项。栈遵循后进先出（LIFO）原则——最后添加的元素是第一个被移除的。如果尝试从空栈中弹出，将发生**栈下溢错误**。

![EVM stack](./images/evm/stack.gif)

> EVM 栈的最大大小为 1024 项。

在字节码执行期间，EVM 栈作为**临时存储**使用：操作码从栈顶消耗数据，并将其结果推回栈顶（见下面的 `ADD` 操作码）。考虑一个简单的加法程序：

![EVM stack addition](./images/evm/stack-addition.gif)

提示：所有值都是十六进制的，所以 `0x06 + 0x07 = 0x0d (十进制: 13)`。

让我们花点时间庆祝一下我们编写的第一行 EVM 汇编代码 🎉。

## 程序计数器(Program counter)

在上述示例中，汇编代码左侧的值表示字节码中每个操作码的**字节偏移量**（从 0 开始）：

| 字节码 | 汇编指令 | 指令长度（字节） | 字节偏移量（十六进制） |
| ------ | -------- | ---------------- | ---------------------- |
| 60 06  | PUSH1 06 | 2                | 00                     |
| 60 07  | PUSH1 07 | 2                | 02                     |
| 01     | ADD      | 1                | 04                     |

EVM 用**程序计数器**存储下一个要执行的操作码的字节偏移量（高亮显示）。

![EVM program counter](./images/evm/program-counter.gif)

`JUMP` 操作码通过直接设置程序计数器，启用动态控制流从而允许灵活的程序执行路径并使 EVM 具有 [图灵完备性](https://en.wikipedia.org/wiki/Turing_completeness)。

![EVM JUMP opcode](./images/evm/jump-opcode.gif)

这段代码正在执行一个死循环，并不断地往栈顶添加元素 7。它引入了两个新操作码：

- **JUMP**: 将程序计数器设置为栈顶值（在我们的例子中是 02），确定下一个要执行的指令。
- **JUMPDEST**: 标记跳转操作的目的地，确保预期的目的地。


> 高级别语言（如 [Solidity](https://soliditylang.org/)）利用 `JUMP` 和 `JUMPDEST` 实现诸如条件、循环和内部函数调用等语句。

## 汽油费（Gas）

我们的小程序可能看起来无害。但是其中的无限循环对 EVM构成了重大威胁：它们可以**耗尽资源**，可能导致网络 [**拒绝服务攻击**](https://en.wikipedia.org/wiki/Denial-of-service_attack)。

EVM 的 **gas** 机制通过充当计算使用资源的货币来应对这种威胁。gas 费基于使用的硬件资源（如存储容量或计算能力）来计算。交易通过以太坊代币支付 gas 费以使用 EVM，如果它们在完成之前耗尽 gas 费（如无限循环），EVM 会停止该交易继续执行以防止资源耗尽。

这保护了网络免受资源密集型或恶意攻击的影响。由于 gas 费限制了计算步骤的数量，EVM 被认为是**准图灵完备**的。

![EVM Gas](./images/evm/evm-gas.gif)

在我们的示例中，假设每个操作码消耗 1 单位的 gas 以简化计算，但实际 gas 成本会根据操作码的复杂性而变化。不过核心理念是一致的。

请参考 [Yellow Paper 的附录 G](https://ethereum.github.io/yellowpaper/paper.pdf) 获取具体的 gas 费。

## 内存（Memory）

EVM 内存是一个字节数组，大小为 $2^{256}$（或 [实际无限](https://www.talkcrypto.org/blog/2019/04/08/all-you-need-to-know-about-2256/)）字节。所有内存位置会初始化为零。

![EVM Memory](./images/evm/evm-memory.gif)

与用来存储每个指令所需操作数据的栈不同，内存存储与整个程序相关的临时数据。

### 写入内存

`MSTORE` 从栈中获取两个值：一个**偏移量**和一个 32 字节的**值**。然后，它将该值写入指定偏移量的内存中。

![MSTORE](./images/evm/mstore.gif)

`MSIZE` 报告当前使用的内存大小（以字节为单位）并压入栈中。

`MSTORE8` 与 `MSTORE` 类似，但只写入 1 字节。

![MSTORE8](./images/evm/mstore8.gif)

注意：当写入 07 到内存时，现有的值（06）保持不变。07 会被写入相邻的字节。

当前占用的内存大小仍然是 1 个字。

### 内存扩展 (Memory expansion)

在 EVM 中，内存是按 1 个字（32 字节）的倍数动态分配的。EVM 也会基于扩展的页数收取 gas 费。

![Memory expansion](./images/evm/memory-expansion.gif)

在一个字节偏移量的位置写入一个字，会导致溢出初始内存页，触发内存扩展到 2 个字（64 字节或 0x40）。

### 读取内存 (Reading from memory)

`MLOAD` 指令从内存中读取一个值并压入栈中。

![MLOAD](./images/evm/mload.gif)

EVM 没有直接等价的 `MSTORE8` 用于读取。必须使用 `MLOAD` 读取整个字，然后使用 [掩码](<https://en.wikipedia.org/wiki/Mask_(computing)>) 提取所需的字节。

> EVM 内存被显示为 32 字节的块，以说明内存扩展的工作原理。实际上，它是一个连续的字节序列，没有任何固有的分隔或块。

## Storage

Storage 被设计为一个**以字为地址的字数组**。与 Memory 不同，Storage 与以太坊账户相关联，并作为世界状态的一部分在交易之间**持久保存**。

![EVM Storage](./images/evm/evm-storage.jpg)

Storage 只能通过其关联账户的代码来访问。外部账户没有代码，因此无法访问自己的 Storage。

## Writing to storage

`SSTORE` 从栈中获取两个值：一个存储**槽位**和一个 32 字节的**值**。然后它将该值写入账户的 Storage 中。

![EVM Storage write](./images/evm/sstore.gif)

在此之前，我们一直在关注合约账户的字节码执行过程。现在当我们看到账户和世界状态时，就能发现它们与 EVM 内部运行的代码是完全对应的。

再次强调，Storage 不是 EVM 本身的一部分，而是属于当前执行的合约账户。

上面的例子只展示了账户 Storage 的一小部分。与内存一样，Storage 中的所有值初始都被定义为零。

### 读取存储 (Reading from storage)

`SLOAD` 从栈中获取存储**槽位**，并将其值加载回栈中。

![EVM Storage read](./images/evm/sload.gif)

注意存储值在示例之间保持不变，这展示了它在世界状态中的持久性。由于世界状态需要在所有节点间复制，存储操作的 gas 费用很高。

> ℹ️ 注意
> 查看 [transaction](/wiki/EL/transaction.md) 维基页面以了解 EVM 的实际运行。

## Wrapping up

除非性能优化至关重要，否则开发人员很少直接编写 EVM 汇编代码。相反，大多数开发人员使用像 [Solidity](https://soliditylang.org/) 这样的高级语言，然后将其编译成字节码。

以太坊是一个持续发展的协议，虽然我们讨论的基础知识将在很大程度上保持不变，但建议关注 [以太坊改进提案(EIPs)](https://eips.ethereum.org/) 和 [网络升级](https://ethereum.org/history)，以了解以太坊生态系统的最新发展。

## 以太坊虚拟机升级(EVM upgrades)

虽然以太坊协议在每次升级中都会经历许多变化，但 EVM 的变化相对较小。因为 EVM 的重大变更可能会破坏合约和语言的兼容性，需要维护多个版本的 EVM，这会带来大量的复杂性开销。EVM 本身仍然会进行一些不破坏其逻辑的升级，比如新的操作码或对现有操作码的修改。一些例子是像 [1153](https://eips.ethereum.org/EIPS/eip-1153)、[4788](https://eips.ethereum.org/EIPS/eip-4788)、[5000](https://eips.ethereum.org/EIPS/eip-5000)、[5656](https://eips.ethereum.org/EIPS/eip-5656) 和 [6780](https://eips.ethereum.org/EIPS/eip-6780) 这样的 EIP。除了最后一个特别有趣的 EIP（它在不破坏兼容性的情况下中和了 `SELFDESTRUCT` 操作码）之外，这些都在提议添加新的操作码。另一个标志着重大变革的重要 EVM 升级是 [EOF](https://notes.ethereum.org/@ipsilon/mega-eof-specification)。它为字节码创建了一种 EVM 可以更容易理解和处理的格式，涵盖了各种 EIP，并且已经讨论和完善了相当长的时间。

## 资源

### 状态机和计算理论

- 📝 Mark Shead, ["Understanding State Machines."](https://medium.com/free-code-camp/state-machines-basics-of-computer-science-d42855debc66) • [archived](https://web.archive.org/web/20210309014946/https://medium.com/free-code-camp/state-machines-basics-of-computer-science-d42855debc66)
- 🎥 Prof. Harry Porter, ["Theory of computation."](https://www.youtube.com/playlist?list=PLbtzT1TYeoMjNOGEiaRmm_vMIwUAidnQz)
- 📘 Michael Sipser, ["Introduction to the Theory of Computation."](https://books.google.com/books/about/Introduction_to_the_Theory_of_Computatio.html?id=4J1ZMAEACAAJ)
- 🎥 Shimon Schocken et al., ["Build a Modern Computer from First Principles: From Nand to Tetris."](https://www.coursera.org/learn/build-a-computer)

### EVM 学习资源

下面根据不同的学习阶段和目标汇总了一些 EVM 相关的学习资料。

#### EVM 基础

- 🎥 Whiteboard Crypto, ["EVM: An animated non-technical introduction."](https://youtu.be/sTOcqS4msoU)
- 📝 Vasa, [Getting Deep Into EVM: How Ethereum Works Backstage](https://medium.com/swlh/getting-deep-into-evm-how-ethereum-works-backstage-ab6ad9c0d0bf)
- 📝 Zaryab Afser, [The ABCs of Ethereum Virtual Machine](https://www.decipherclub.com/the-abcs-of-ethereum-virtual-machine/)
- 📝 Preethi, [EVM Tweet Thread](https://twitter.com/iam_preethi/status/1483459717670309895)
- 📝 Decipher Club, [EVM learning resources based on your level of expertise](https://www.decipherclub.com/evm-learning-resources/)

#### 理解 EVM 架构和核心组件

- 📝 Gavin Wood, ["Ethereum Yellow Paper."](https://ethereum.github.io/yellowpaper/paper.pdf)
- 📝 Ethereum Book, [Chapter 13, Ethereum Book](https://cypherpunks-core.github.io/ethereumbook/13evm.html?ref=decipherclub.com)
- 📘 Andreas M. Antonopoulos & Gavin Wood, ["Mastering Ethereum."](https://github.com/ethereumbook/ethereumbook)
- 🎥 Jordan McKinney, ["Ethereum Explained: The EVM."](https://www.youtube.com/watch?v=kCswGz9naZg)
- 📝 LeftAsExercise, ["Smart contracts and the Ethereum virtual machine."](https://leftasexercise.com/2021/08/08/q-smart-contracts-and-the-ethereum-virtual-machine/) • [archived](https://web.archive.org/web/20230324200211/https://leftasexercise.com/2021/08/08/q-smart-contracts-and-the-ethereum-virtual-machine/)
- 📝 Femboy Capital, ["A Playdate with the EVM."](https://femboy.capital/evm-pt1) • [archived](https://web.archive.org/web/20221001113802/https://femboy.capital/evm-pt1)
- 🎥 Alex, [EVM - Some Assembly Required](https://www.youtube.com/watch?v=yxgU80jdwL0)

#### EVM 深入探讨

- 📝 Takenobu Tani, [EVM illustrated](https://github.com/takenobu-hs/ethereum-evm-illustrated)
- 📝 Shafu, ["EVM from scratch."](https://evm-from-scratch.xyz/)
- 📝 NOXX, ["3 part series: EVM Deep Dives - The Path to Shadowy Super Coder."](https://noxx.substack.com/p/evm-deep-dives-the-path-to-shadowy) • [archived](https://web.archive.org/web/20240106034644/https://noxx.substack.com/p/evm-deep-dives-the-path-to-shadowy)
- 📝 OpenZeppelin, ["6 part series: Deconstructing a Solidity."](https://blog.openzeppelin.com/deconstructing-a-solidity-contract-part-i-introduction-832efd2d7737) • [archived](https://web.archive.org/web/20240121025651/https://blog.openzeppelin.com/deconstructing-a-solidity-contract-part-i-introduction-832efd2d7737)
- 📝 TrustLook, ["Understand EVM bytecode."](https://blog.trustlook.com/understand-evm-bytecode-part-1/) • [archived](https://web.archive.org/web/20230603080857/https://blog.trustlook.com/understand-evm-bytecode-part-1/)
- 📝 Degatchi, ["A Low-Level Guide To Solidity's Storage Management."](https://degatchi.com/articles/low_level_guide_to_soliditys_storage_management) • [archived](https://web.archive.org/web/20231202105650/https://degatchi.com/articles/low_level_guide_to_soliditys_storage_management/)
- 📝 Zaryab Afser, ["Journey of smart contracts from Solidity to Bytecode"](https://www.decipherclub.com/ethereum-virtual-machine-article-series/)
- 🎥 Ethereum Engineering Group, [EVM: From Solidity to byte code, memory and storage](https://www.youtube.com/watch?v=RxL_1AfV7N4&t=2s)
- 📝 Trust Chain, [7 part series about how Solidity uses EVM under the hood.](https://trustchain.medium.com/reversing-and-debugging-evm-smart-contracts-392fdadef32d)

### EVM 工具和习题

- 🧮 smlXL, ["evm.codes: Opcode reference and interactive playground."](https://www.evm.codes/)
- 🧮 smlXL, ["evm.storage: Interactive storage explorer."](https://www.evm.storage/)
- 🧮 Ethervm, [Low level reference for EVM opcodes](https://ethervm.io/)
- 🎥 Austin Griffith, ["ETH.BUILD."](https://www.youtube.com/watch?v=30pa790tIIA&list=PLJz1HruEnenCXH7KW7wBCEBnBLOVkiqIi)
- 💻 Franco Victorio, ["EVM puzzles."](https://github.com/fvictorio/evm-puzzles)
- 💻 Dalton Sweeney, ["More EVM puzzles."](https://github.com/daltyboy11/more-evm-puzzles)
- 💻 Zaryab Afser, ["Decipher EVM puzzles."](https://www.decipherclub.com/decipher-evm-puzzles-game/)

## EVM 实现

- 💻 Solidity: Brock Elmore, ["solvm: EVM implemented in solidity."](https://github.com/brockelmore/solvm)
- 💻 Go: [Geth](https://github.com/ethereum/go-ethereum)
- 💻 C++: [EVMONE](https://github.com/ethereum/evmone)
- 💻 Python: [py-evm](https://github.com/ethereum/py-evm)
- 💻 Rust: [revm](https://github.com/bluealloy/revm)
- 💻 Js/CSS: Riley, ["The Ethereum Virtual Machine."](https://github.com/jtriley-eth/the-ethereum-virtual-machine)

### EVM 支持的编程语言

- 🗄 [Solidity](https://soliditylang.org/)
- 🗄 [Huff](https://github.com/huff-language/)
- 🗄 [Vyper](https://docs.vyperlang.org/en/stable/)
- 🗄 [Fe](https://fe-lang.org/)
