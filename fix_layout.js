const fs = require('fs');
const content = fs.readFileSync('src/app/dashboard/layout.tsx', 'utf8');

const regex = /{isProductDetailActive && layoutSelectedProduct && \([\s\S]*?<\/ProductDetailModal>\s*\)}/;
const replacement = `{isProductDetailActive && layoutSelectedProduct && (
          <ProductDetailModal
            product={layoutSelectedProduct}
            open={true}
            isInline={false}
            onClose={() => closeProductDetail()}
            onSave={async () => closeProductDetail()}
          />
        )}`;

const newContent = content.replace(regex, replacement);
fs.writeFileSync('src/app/dashboard/layout.tsx', newContent);
