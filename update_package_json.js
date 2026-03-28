const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts['test:e2e'] = 'playwright test';
pkg.scripts['test:e2e:ui'] = 'playwright test --ui';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
