const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'js', 'cesium');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'logger.js');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/console\.log\(/g, 'Logger.info(\'Cesium\', ');
  content = content.replace(/console\.warn\(/g, 'Logger.warn(\'Cesium\', ');
  content = content.replace(/console\.error\(/g, 'Logger.error(\'Cesium\', ');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
