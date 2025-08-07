# 16tg-image-uploader
这个 Telegram 机器人是一个方便的工具，旨在简化图片上传流程。它部署在 Cloudflare Workers 上，能够接收您直接发送的图片，然后自动将其上传到 16图床 服务。  上传成功后，机器人会即时返回多种格式的图片链接，包括直链、HTML 代码、BBCode 和 Markdown 格式，方便您在不同平台和场景下使用。它支持通过环境变量配置 Telegram Bot Token、16图床的基础 URL 和 Auth-Token，甚至可以设置允许使用的用户白名单，确保安全和控制

# 📋 准备工作
## 1.Telegram Bot Token：

在 Telegram 中搜索 `@BotFather`。

发送 `/newbot` 命令，并按照提示为您的机器人命名和设置用户名。

BotFather 将为您提供一个 `HTTP API Token`。请务必保存好这个 Token，这是机器人与 Telegram API 通信的凭证。
就是这个东西
<img width="662" height="423" alt="image" src="https://github.com/user-attachments/assets/6d0ba5fc-1cf5-47d4-a8a4-92072f4280dd" />

## 2.Cloudflare 账号
如果您还没有，请前往 [Cloudflare 官网](https://cloudflare.com) 注册一个免费账号。

# 🛠️ 部署步骤
## 步骤 1: 创建 Cloudflare Worker

1. 登录您的 Cloudflare Dashboard。

1. 在左侧导航栏中，点击计算（Workers）-> 点击 Workers 和 Pages。

1. 点击右侧的 创建按钮。

1. 在弹出的页面中，点击 从 Hello World! 开始 -> 开始使用。

1. 为您的 Worker 命名（例如：`tg-image-uploader`），然后点击 部署。

## 步骤 2: 粘贴机器人代码
1. 部署成功后，点击您刚刚创建的 Worker 名称（例如：tg-image-uploader）。

1. 进入 Worker 页面后，点击右上角 编辑代码 按钮。
<img width="2128" height="145" alt="image" src="https://github.com/user-attachments/assets/a1d2b29e-c473-4d47-b490-10ea3da14bc7" />


1. 您会看到一个默认的 Worker 代码。请删除所有默认代码，然后将本文档中提供的 最新 JavaScript 代码粘贴到编辑器中。

1. 点击右上角的 部署 按钮。

## 步骤 3: 配置环境变量
环境变量是存储敏感信息（如 API Token）和配置（如允许的用户列表）的最佳方式，而无需将它们直接硬编码到代码中。

1. 在您的 Worker 页面中，点击顶部的 设置 选项卡。

1. 向下滚动找到 变量和机密 部分。
<img width="1110" height="410" alt="image" src="https://github.com/user-attachments/assets/8b2ddf66-6ed5-4880-ba74-eece3df7ea04" />


1. 点击 添加 按钮，并添加以下变量：

   - 变量名: TELEGRAM_BOT_TOKEN

   - 值: 粘贴您从 BotFather 获得的 Telegram Bot Token。


1. 变量名: IMAGE_HOST_BASE_URL

   - 值: 填写 https://i.111666.best


1. 变量名: IMAGE_HOST_AUTH_TOKEN

   - 值: 粘贴您为16图床生成的随机字符串。从官网获取
<img width="2537" height="214" alt="image" src="https://github.com/user-attachments/assets/f05dec95-0604-4154-85e5-7356033b53e6" />



1. 变量名: ALLOWED_USERS (可选)

   - 值: 如果您想限制只有特定用户才能使用机器人，请在此处填写允许的 Telegram 用户 ID 列表，用逗号 , 分隔（例如：12345,67890,98765）。
可以再这里获取
<img width="557" height="891" alt="image" src="https://github.com/user-attachments/assets/ea6b8d86-a24f-46c2-b66c-a1348ca93537" />


如果您想让所有用户都能使用机器人，请将此字段留空。

## 步骤 4: 设置 Telegram Webhook
现在，您需要告诉 Telegram，当有新消息时，它应该将更新发送到您的 Cloudflare Worker。

1. 获取您的 Worker 的 URL。在 Worker 页面的 设置 选项卡中，您会看到一个 URL，通常是 https://your-worker-name.your-account-id.workers.dev。复制这个 URL。在这里
<img width="1110" height="340" alt="image" src="https://github.com/user-attachments/assets/8964193a-b336-4c9a-b1b4-38ced9843f51" />


1. 在浏览器中打开以下 URL，将 <YOUR_BOT_TOKEN> 替换为您的 Telegram Bot Token，将 <YOUR_WORKER_URL> 替换为您刚刚复制的 Worker URL：

`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WORKER_URL>`

示例：如果您的 Bot Token 是 `123456:ABC-DEF1234ghIkl-zyx57W2E1u12u1`，Worker URL 是` https://tg-image-uploader.your-account-id.workers.dev`，那么您应该访问：

`https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2E1u12u1/setWebhook?url=https://tg-image-uploader.your-account-id.workers.dev`

如果成功，您将在浏览器中看到类似 `{"ok":true,"result":true,"description":"Webhook was set"}` 的响应。


# ✅ 测试您的机器人
现在，您的机器人已经部署并配置完毕！

1. 在 Telegram 中找到您的机器人。

1. 发送 `/start` 命令，机器人应该会回复欢迎消息。

1. 尝试向机器人发送一张图片。

1. 如果一切正常，机器人应该会回复一个包含多个链接选项的消息。点击这些按钮，检查链接是否正确。

# 🖼️效果图

|主页面|直链|Markdown|
|---|---|---|
|<img width="459" height="341" alt="image" src="https://github.com/user-attachments/assets/2b82249b-83f4-4d9a-82c2-3a23eaa25ef3" />|<img width="670" height="175" alt="image" src="https://github.com/user-attachments/assets/5e92fae3-2479-4e0e-9126-7b6b26a53226" />|<img width="672" height="211" alt="image" src="https://github.com/user-attachments/assets/48cad2c5-b38f-4cb3-bbf9-7bfceca1b45e" />|

其他以此类推，点击链接自动复制
<img width="960" height="653" alt="image" src="https://github.com/user-attachments/assets/d3aae87d-c4d9-4c0d-a455-31adad9dd240" />

