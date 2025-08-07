# 16tg-image-uploader
这个 Telegram 机器人是一个方便的工具，旨在简化图片上传流程。它部署在 Cloudflare Workers 上，能够接收您直接发送的图片，然后自动将其上传到 16图床 服务。  上传成功后，机器人会即时返回多种格式的图片链接，包括直链、HTML 代码、BBCode 和 Markdown 格式，方便您在不同平台和场景下使用。它支持通过环境变量配置 Telegram Bot Token、16图床的基础 URL 和 Auth-Token，甚至可以设置允许使用的用户白名单，确保安全和控制
