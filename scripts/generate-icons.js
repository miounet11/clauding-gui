import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateIcons() {
  const sourceIcon = path.join(__dirname, '../../icon.png');
  const iconsDir = path.join(__dirname, '../src-tauri/icons');
  
  try {
    // 确保图标目录存在
    await fs.mkdir(iconsDir, { recursive: true });
    
    // 生成不同尺寸的图标
    const sizes = [
      { size: 32, name: '32x32.png' },
      { size: 128, name: '128x128.png' },
      { size: 256, name: '128x128@2x.png' },
      { size: 512, name: 'icon.png' }
    ];
    
    for (const { size, name } of sizes) {
      const outputPath = path.join(iconsDir, name);
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`生成图标: ${name} (${size}x${size})`);
    }
    
    console.log('\n所有图标已成功生成！');
    console.log('注意：macOS 的 .icns 文件需要使用专门的工具生成。');
    console.log('您可以使用以下命令生成 .icns 文件：');
    console.log('iconutil -c icns icon.iconset');
    
  } catch (error) {
    console.error('生成图标时出错:', error);
    process.exit(1);
  }
}

generateIcons();