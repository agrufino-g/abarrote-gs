const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/others/promotions/page.tsx', 'utf8');

const regex = /  return \(\n    <Modal[\s\S]*?(?=^  \);\n\}|\Z)/m;
const match = content.match(regex);
if (!match) {
  console.log("Could not find the Modal block.");
} else {
  console.log("Found modal block length: ", match[0].length);
}

