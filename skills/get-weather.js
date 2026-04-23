module.exports = {
   name: 'get_weather',
   description: '获取指定城市的天气信息',
   parameters: [
      {
         name: 'city',
         type: 'string',
         description: '城市名称，如: 北京、上海、广州'
      }
   ],
   async execute(params) {
      const city = params.city;
      
      if (!city) {
         return {
            success: false,
            message: '请提供城市名称'
         };
      }
      
      try {
         const response = await fetch(
            `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=zh`
         );
         
         if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
         }
         
         const data = await response.json();
         const current = data.current_condition?.[0];
         
         if (!current) {
            return {
               success: false,
               message: `未找到城市 "${city}" 的天气信息`
            };
         }
         
         const weather = {
            city: city,
            temperature: `${current.temp_C}°C`,
            feelsLike: `${current.FeelsLikeC}°C`,
            description: current.lang_zh?.[0]?.value || current.weatherDesc?.[0]?.value,
            humidity: `${current.humidity}%`,
            wind: `${current.windspeedKmph} km/h ${current.winddir16Point}`,
            visibility: `${current.visibility} km`
         };
         
         return {
            success: true,
            weather,
            message: `${weather.city}天气: ${weather.description}, 温度: ${weather.temperature}, 体感: ${weather.feelsLike}, 湿度: ${weather.humidity}, 风速: ${weather.wind}`
         };
      } catch (error) {
         return {
            success: false,
            message: `获取天气失败: ${error.message}`
         };
      }
   }
};
