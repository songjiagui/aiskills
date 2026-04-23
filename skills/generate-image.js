const axios = require('axios');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'generated_images');

if (!fs.existsSync(IMAGES_DIR)) {
   fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const MODELSCOPE_CONFIG = {
   baseUrl: 'https://api-inference.modelscope.cn/',
   apiKey: process.env.MODELSCOPE_API_KEY || 'ms-xxxx',
   model: 'Tongyi-MAI/Z-Image-Turbo',
   defaultParams: {
      size: '1024x1920',
      numInferenceSteps: 29,
      guidance_scale: 0.7
   }
};

const headers = {
   'Authorization': `Bearer ${MODELSCOPE_CONFIG.apiKey}`,
   'Content-Type': 'application/json'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
   name: 'generate_image',
   description: '使用 AI 生成图片。根据文本描述生成高质量图片。',
   when_to_use: '用户要求生成图片、生成图片、创建图片时使用。',
   parameters: [
      {
         name: 'prompt',
         type: 'string',
         description: '图片描述文本，详细描述需要生成的图片内容'
      },
      {
         name: 'size',
         type: 'string',
         description: '图片尺寸 (可选)，默认 1024x1920，支持 1024x1024, 1024x1920, 1920x1080 等'
      },
      {
         name: 'numInferenceSteps',
         type: 'number',
         description: '推理步数 (可选)，默认 29，值越高细节越丰富，但生成时间越长'
      },
      {
         name: 'guidance_scale',
         type: 'number',
         description: '引导系数 (可选)，默认 0.7，控制文本对生成的影响程度'
      }
   ],
   async execute(params) {
      const { prompt, size, numInferenceSteps, guidance_scale } = params;

      if (!prompt) {
         return { success: false, message: '请提供图片描述文本 (prompt)' };
      }

      const imageParams = {
         prompt,
         size: size || MODELSCOPE_CONFIG.defaultParams.size,
         numInferenceSteps: numInferenceSteps || MODELSCOPE_CONFIG.defaultParams.numInferenceSteps,
         guidance_scale: guidance_scale || MODELSCOPE_CONFIG.defaultParams.guidance_scale
      };

      try {
         console.log(`[图片生成] 开始生成图片: ${prompt.substring(0, 50)}...`);

         const response = await axios.post(
            `${MODELSCOPE_CONFIG.baseUrl}v1/images/generations`,
            {
               model: MODELSCOPE_CONFIG.model,
               ...imageParams
            },
            {
               headers: {
                  ...headers,
                  'X-ModelScope-Async-Mode': 'true'
               }
            }
         );

         const taskId = response.data.task_id;
         console.log(`[图片生成] 任务已提交，任务ID: ${taskId}`);

         let maxRetries = 60;
         let retryCount = 0;
         let imageData = null;
         let imageUrl = null;

         while (retryCount < maxRetries) {
            await sleep(5000);
            retryCount++;

            console.log(`[图片生成] 检查任务状态... (${retryCount}/${maxRetries})`);
            const result = await axios.get(
               `${MODELSCOPE_CONFIG.baseUrl}v1/tasks/${taskId}`,
               {
                  headers: {
                     ...headers,
                     'X-ModelScope-Task-Type': 'image_generation'
                  }
               }
            );

            const data = result.data;
            console.log(`[图片生成] 当前状态: ${data.task_status}`);

            if (data.task_status === 'SUCCEED') {
               imageUrl = data.output_images[0];
               console.log(`[图片生成] 图像生成成功，开始下载...`);

               const imageResponse = await axios.get(imageUrl, {
                  responseType: 'arraybuffer'
               });

               imageData = imageResponse.data;
               break;
            } else if (data.task_status === 'FAILED') {
               console.error('[图片生成] 图像生成失败');
               return {
                  success: false,
                  message: '图像生成失败',
                  error: data.message || '未知错误'
               };
            }

            console.log('[图片生成] 任务仍在进行中，继续等待...');
         }

         if (!imageData) {
            return {
               success: false,
               message: '图像生成超时或失败'
            };
         }

         const timestamp = Date.now();
         const filename = `image_${timestamp}.jpg`;
         const filePath = path.join(IMAGES_DIR, filename);

         fs.writeFileSync(filePath, imageData);

         const stats = fs.statSync(filePath);
         const fileSizeKB = (stats.size / 1024).toFixed(2);

         console.log(`[图片生成] 图像已保存: ${filename} (${fileSizeKB} KB)`);

         const publicUrl = `/api/images/${filename}`;
         const markdownImage = `![${prompt}](${publicUrl})`;

         return {
            success: true,
            message: `图片生成成功！\n\n${markdownImage}`,
            image: {
               filename,
               url: publicUrl,
               size: imageParams.size,
               prompt,
               fileSize: fileSizeKB + ' KB'
            }
         };

      } catch (error) {
         console.error('[图片生成] 发生错误:', error.message);
         return {
            success: false,
            message: '图片生成失败',
            error: error.response?.data || error.message
         };
      }
   }
};
