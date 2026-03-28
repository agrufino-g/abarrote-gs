const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/others/promotions/page.tsx', 'utf8');

// 1. Rename PromotionFormModal to PromotionFormView and remove `open`
content = content.replace(/function PromotionFormModal\(\{[\s\S]*?\}\: PromotionFormModalProps\) \{/, `function PromotionFormView({
  onClose,
  editing,
  onSave,
  products,
  categories,
}: Omit<PromotionFormModalProps, 'open'>) {`);

// 2. Replace the modal invocation inside PromotionsPage
content = content.replace(/<PromotionFormModal\s+open=\{modalOpen\}\s+onClose=\{\(\) => \{ setModalOpen\(false\); setEditingPromo\(null\); \}\}\s+editing=\{editingPromo\}\s+onSave=\{load\}\s+products=\{products\}\s+categories=\{categories\}\s+\/>/, '');

content = content.replace(/return \(/, `  if (modalOpen) {
    return (
      <PromotionFormView
        onClose={() => { setModalOpen(false); setEditingPromo(null); }}
        editing={editingPromo}
        onSave={load}
        products={products}
        categories={categories}
      />
    );
  }

  return (`);

fs.writeFileSync('src/app/dashboard/others/promotions/page.tsx', content);
