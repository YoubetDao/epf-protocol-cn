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

