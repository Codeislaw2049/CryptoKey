# CryptoKey.im - 零信任安全索引备份工具

**官方网址**: [https://CryptoKey.im](https://CryptoKey.im)  
**Telegram**: [@C_2046](https://t.me/C_2046)  
**X (Twitter)**: [@CryptoKeyim](https://x.com/CryptoKeyim)

🇨🇳 [中文说明](./README_zh.md) | 🇬🇧 [English](./README.md)

> **注意**: 这是 CryptoKey.im 的公开审计仓库（社区版）。  
> 核心商业加密算法 (`wasm-pro`) 和支付验证逻辑 (`workers`) 已替换为占位符。

## 🔒 什么是 CryptoKey.im?

CryptoKey.im 是一个**纯客户端**的安全工具，旨在解决密码管理的“鸡生蛋，蛋生鸡”问题。它允许你：

1. **加密敏感数据**: 使用 AES-256-GCM 加密你的助记词、私钥或密码。
2. **隐写术备份**: 将加密数据隐藏在看起来无害的图片（如猫的照片）中。
3. **物理备份**: 打印“恢复单”，即使所有设备丢失也能恢复数据。
4. **零信任**: 无服务器，无数据库，无追踪。所有操作都在浏览器中完成。

## 🚀 主要功能

- **军用级加密**: 使用 PBKDF2 (100k 次迭代) 派生的 AES-256-GCM。
- **隐写术**: 在 PNG 图片中隐藏加密数据，无可见失真。
- **离线可用**: 100% 离线工作。你可以下载 HTML 或使用 PWA。
- **开源**: 自行验证代码。没有隐藏的后门。

## 🛠️ 技术栈

- **React 18** + **Vite**
- **TypeScript**
- **TailwindCSS**
- **Framer Motion** (动画)
- **Crypto-JS** (加密)
- **Ethers.js** (钱包生成)

## 📦 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/CryptoKey.im.git

# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 构建生产版本
npm run build
```

## ⚠️ 安全须知

- 本工具按“原样”提供。
- 请务必确认 URL 为 `https://CryptoKey.im`（或你自己的部署）。
- 为了获得最高安全性，请下载发布版本并在气隙（断网）机器上运行。
