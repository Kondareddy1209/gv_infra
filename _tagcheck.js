const fs = require('fs');
const file = process.argv[2] || 'index.html';
const html = fs.readFileSync(file, 'utf8');
function countOpen(tag) {
  const re = new RegExp('<' + tag + '(?=[\\s>])', 'g');
  return (html.match(re) || []).length;
}
function countClose(tag) {
  const re = new RegExp('</' + tag + '>', 'g');
  return (html.match(re) || []).length;
}
['div', 'section', 'article'].forEach((t) => {
  console.log(t, 'open', countOpen(t), 'close', countClose(t));
});
console.log('img tags:', (html.match(/<img(?=[\s>])/g) || []).length);
