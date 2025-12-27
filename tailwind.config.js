/** 
 * @type {import(tailwindcss).Config} 
 */
module.exports = {
    // 指定Tailwind需要扫描的文件路径（用于提取样式类名）
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    // 主题配置（自定义颜色、字体等均在此扩展）
    theme: {
        extend: {},
    },
    // 插件配置（可引入第三方Tailwind插件）
    plugins: [],
};