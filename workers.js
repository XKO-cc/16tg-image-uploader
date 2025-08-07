export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Expected POST request', { status: 405 });
    }

    try {
      const update = await request.json();

      const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
      const IMAGE_HOST_BASE_URL = (env.IMAGE_HOST_BASE_URL || 'https://i.111666.best').replace(/\/+$/, '');
      const IMAGE_HOST_AUTH_TOKEN = env.IMAGE_HOST_AUTH_TOKEN;
      const ALLOWED_USERS = env.ALLOWED_USERS ? env.ALLOWED_USERS.split(',').map(id => id.trim()) : [];

      if (!TELEGRAM_BOT_TOKEN || !IMAGE_HOST_AUTH_TOKEN) {
        console.error("Error: Missing required environment variables (TELEGRAM_BOT_TOKEN or IMAGE_HOST_AUTH_TOKEN).");
        return new Response("Bot configuration error.", { status: 500 });
      }

      const sendTelegramApiRequest = async (method, payload) => {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Telegram API error (${method}): ${response.status} - ${errorText}`);
          throw new Error(`Telegram API error: ${errorText}`);
        }
        return response.json();
      };

      const isUserAllowed = (userId) => {
        return ALLOWED_USERS.length === 0 || ALLOWED_USERS.includes(String(userId));
      };

      if (update.message) {
        const message = update.message;
        const chatId = message.chat.id;
        const userId = message.from.id;
        const firstName = message.from.first_name || "用户";

        console.log(`Received message from user ${userId} (${firstName}) in chat ${chatId}`);

        if (!isUserAllowed(userId)) {
          console.log(`User ${userId} is not allowed.`);
          await sendTelegramApiRequest('sendMessage', {
            chat_id: chatId,
            text: "您没有权限使用此机器人。",
          });
          return new Response('Unauthorized user', { status: 200 });
        }

        await sendTelegramApiRequest('sendChatAction', {
          chat_id: chatId,
          action: 'upload_photo',
        });

        let fileId = null;
        let mimeType = null;
        let fileName = null;

        if (message.photo && message.photo.length > 0) {
          fileId = message.photo[message.photo.length - 1].file_id;
          mimeType = 'image/jpeg';
          fileName = `${fileId}.jpg`;
          console.log(`Detected photo with file_id: ${fileId}`);
        } else if (message.document && message.document.mime_type && message.document.mime_type.startsWith('image/')) {
          fileId = message.document.file_id;
          mimeType = message.document.mime_type;
          fileName = message.document.file_name;
          console.log(`Detected image document with file_id: ${fileId}, mime_type: ${mimeType}`);
        } else if (message.text === '/start') {
          await sendTelegramApiRequest('sendMessage', {
            chat_id: chatId,
            text: `您好，我是一个16图床机器人，${firstName}！请直接发送图片以获取上传链接。`,
          });
          return new Response('Start command handled', { status: 200 });
        } else {
          console.log("Received unsupported message type.");
          await sendTelegramApiRequest('sendMessage', {
            chat_id: chatId,
            text: "不支持的文件类型，请发送图片。",
          });
          return new Response('Unsupported file type', { status: 200 });
        }

        if (!fileId) {
          console.error("No file_id found in message.");
          await sendTelegramApiRequest('sendMessage', {
            chat_id: chatId,
            text: "无法获取文件ID，请重试或联系管理员。",
          });
          return new Response('File ID not found', { status: 200 });
        }

        try {
          console.log(`Fetching file info for file_id: ${fileId}`);
          const fileInfoResponse = await sendTelegramApiRequest('getFile', { file_id: fileId });
          const filePath = fileInfoResponse.result.file_path;
          const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
          console.log(`File download URL: ${downloadUrl}`);

          const imageResponse = await fetch(downloadUrl);
          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            throw new Error(`Failed to download image from Telegram: ${imageResponse.status} - ${errorText}`);
          }
          const imageBlob = await imageResponse.blob();
          console.log(`Image downloaded from Telegram. Size: ${imageBlob.size} bytes`);

          const uploadApiUrl = `${IMAGE_HOST_BASE_URL}/image`;
          console.log(`Uploading image to 16图床: ${uploadApiUrl}`);
          const formData = new FormData();
          formData.append('image', imageBlob, fileName);

          const uploadHeaders = {
            'Auth-Token': IMAGE_HOST_AUTH_TOKEN,
          };

          const imageHostResponse = await fetch(uploadApiUrl, {
            method: 'POST',
            headers: uploadHeaders,
            body: formData,
          });

          const imageHostResponseClone = imageHostResponse.clone();

          let imageHostResult;
          try {
            imageHostResult = await imageHostResponseClone.json();
          } catch (jsonError) {
            const rawResponseText = await imageHostResponse.text();
            console.error('16图床 API response was not JSON. Raw response:', rawResponseText);
            throw new Error(`16图床 API 返回非 JSON 响应。原始内容: ${rawResponseText.substring(0, 200)}... (查看 Worker 日志获取完整内容)`);
          }

          console.log('16图床 API response status:', imageHostResponse.status);
          console.log('16图床 API response content:', JSON.stringify(imageHostResult));

          if (imageHostResponse.ok && imageHostResult.ok === true && imageHostResult.src) {
            const uploadedUrl = `${IMAGE_HOST_BASE_URL}${imageHostResult.src}`;
            console.log(`16图床 upload successful: ${uploadedUrl}`);

            const encodedRelativePath = encodeURIComponent(imageHostResult.src);
            console.log(`DEBUG (Upload): Encoded relative path for callback_data: ${encodedRelativePath}`);

            const messageText = `🎉 图片上传成功！\n\n💡 点击下方按钮可直接复制对应内容`;
            const keyboard = [
              [{ text: "复制直链", callback_data: `copy:direct:${encodedRelativePath}` }],
              [{ text: "复制HTML", callback_data: `copy:html:${encodedRelativePath}` }],
              [{ text: "复制BBCode", callback_data: `copy:bbcode:${encodedRelativePath}` }],
              [{ text: "复制Markdown", callback_data: `copy:markdown:${encodedRelativePath}` }],
            ];
            const replyMarkup = { inline_keyboard: keyboard };

            await sendTelegramApiRequest('sendMessage', {
              chat_id: chatId,
              text: messageText,
              parse_mode: 'Markdown',
              reply_markup: replyMarkup,
            });
          } else {
            const errorMsg = imageHostResult.message || JSON.stringify(imageHostResult);
            throw new Error(`16图床上传失败，状态码：${imageHostResponse.status}，响应：${errorMsg}`);
          }
        } catch (e) {
          console.error(`Error during image upload process: ${e.message}`);
          await sendTelegramApiRequest('sendMessage', {
            chat_id: chatId,
            text: `上传图片时出错: ${e.message}`,
          });
        }
        return new Response('Message processed', { status: 200 });
      }

      if (update.callback_query) {
        const query = update.callback_query;
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;

        console.log(`Received callback query: ${data}`);

        await sendTelegramApiRequest('answerCallbackQuery', {
          callback_query_id: query.id,
        });

        const parts = data.split(':');
        const action = parts[0];
        let format = null;
        let encodedRelativePath = null;

        if (action === 'copy') {
            format = parts[1];
            encodedRelativePath = parts.slice(2).join(':');
        } else if (action === 'return') {
            encodedRelativePath = parts[1];
        }

        console.log(`DEBUG (Callback): Action: ${action}, Format: ${format}, Raw encodedRelativePath from data: ${encodedRelativePath}`);

        const relativePath = decodeURIComponent(encodedRelativePath);
        console.log(`DEBUG (Callback): Decoded relative path: ${relativePath}`);

        const IMAGE_HOST_BASE_URL = (env.IMAGE_HOST_BASE_URL || 'https://i.111666.best').replace(/\/+$/, '');
        console.log(`DEBUG (Callback): IMAGE_HOST_BASE_URL: ${IMAGE_HOST_BASE_URL}`);

        const fullUrl = new URL(relativePath, IMAGE_HOST_BASE_URL).toString();
        console.log(`DEBUG (Callback): Constructed fullUrl: ${fullUrl}`);

        let content = '';
        let messageText = '';
        let keyboard = [];

        if (action === 'copy') {
          switch (format) {
            case 'direct':
              content = fullUrl;
              console.log(`DEBUG (Callback): Direct link content: ${content}`);
              break;
            case 'html':
              content = `<img src="${fullUrl}" alt="image">`;
              console.log(`DEBUG (Callback): HTML content: ${content}`);
              break;
            case 'bbcode':
              content = `[img]${fullUrl}[/img]`;
              console.log(`DEBUG (Callback): BBCode content: ${content}`);
              break;
            case 'markdown':
              content = `![image](${fullUrl})`;
              console.log(`DEBUG (Callback): Markdown content: ${content}`);
              break;
            default:
              content = '未找到内容';
          }
          messageText = `已为您准备好内容，请手动复制：\n\`${content}\``;
          keyboard = [[{ text: "返回", callback_data: `return:${encodedRelativePath}` }]];
        } else if (action === 'return') {
          console.log(`DEBUG (Return Action): Rebuilding keyboard with encodedRelativePath: ${encodedRelativePath}`);
          messageText = `🎉 图片上传成功！\n\n💡 点击下方按钮可直接复制对应内容`;
          keyboard = [
            [{ text: "复制直链", callback_data: `copy:direct:${encodedRelativePath}` }],
            [{ text: "复制HTML", callback_data: `copy:html:${encodedRelativePath}` }],
            [{ text: "复制BBCode", callback_data: `copy:bbcode:${encodedRelativePath}` }],
            [{ text: "复制Markdown", callback_data: `copy:markdown:${encodedRelativePath}` }],
          ];
        } else {
          messageText = "未知操作";
          keyboard = [[{ text: "返回", callback_data: `return:${encodedRelativePath}` }]];
        }

        await sendTelegramApiRequest('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text: messageText,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard },
        });

        return new Response('Callback query processed', { status: 200 });
      }

      return new Response('OK', { status: 200 });

    } catch (error) {
      console.error('Unhandled error:', error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },
};
