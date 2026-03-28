const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/others/promotions/page.tsx', 'utf8');

const oldApplicableSection = `          <ChoiceList
            title="Aplicable a"
            titleHidden
            choices={APPLICABLE_OPTIONS}
            selected={[applicableTo]}
            onChange={handleApplicableToChange}
          />

          {applicableTo === 'all' && (
            <Banner tone="info">
              <Text as="span" variant="bodySm">
                Esta promoción se aplicará a todos los productos del catálogo.
              </Text>
            </Banner>
          )}

          {applicableTo !== 'all' && (
            <BlockStack gap="300">
              {/* Selected items as tags */}
              {selectedItems.length > 0 && (
                <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" as="p" tone="subdued">
                      {applicableTo === 'product'
                        ? \`\${selectedItems.length} producto\${selectedItems.length === 1 ? '' : 's'} seleccionado\${selectedItems.length === 1 ? '' : 's'}\`
                        : \`\${selectedItems.length} categoría\${selectedItems.length === 1 ? '' : 's'} seleccionada\${selectedItems.length === 1 ? '' : 's'}\`}
                    </Text>
                    <InlineStack gap="100" wrap>
                      {selectedItems.map((item) => (
                        <Tag key={item.id} onRemove={() => removeItem(item.id)}>
                          {item.name}
                        </Tag>
                      ))}
                    </InlineStack>
                  </BlockStack>
                </Box>
              )}

              {/* Search and add */}
              <TextField
                label={applicableTo === 'product' ? 'Buscar producto' : 'Buscar categoría'}
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={
                  applicableTo === 'product'
                    ? 'Buscar por nombre, SKU o código de barras...'
                    : 'Buscar por nombre de categoría...'
                }
                prefix={<Icon source={SearchIcon} />}
                autoComplete="off"
                clearButton
                onClearButtonClick={() => setSearchQuery('')}
              />

              {/* Search results list */}
              {searchResults.length > 0 && (
                <Box
                  borderWidth="025"
                  borderColor="border"
                  borderRadius="200"
                  overflowX="hidden"
                  overflowY="hidden"
                >
                  <Scrollable style={{ maxHeight: '200px' }}>
                    <BlockStack>
                      {searchResults.map((item, idx) => {
                        const isProduct = applicableTo === 'product';
                        const product = isProduct ? (item as Product) : null;
                        const category = !isProduct ? (item as ProductCategory) : null;
                        return (
                          <Box key={item.id} padding="0">
                            <button
                              type="button"
                              onClick={() => addItem(item.id)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: idx % 2 === 0 ? 'transparent' : 'var(--p-color-bg-surface-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span>
                                <Text as="span" variant="bodyMd" fontWeight="semibold">
                                  {product ? product.name : category?.name ?? ''}
                                </Text>
                                {product && (
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    {\` — \${product.sku} — \${formatCurrency(product.unitPrice)}\`}
                                  </Text>
                                )}
                              </span>
                              <Box>
                                <Icon source={PlusIcon} tone="interactive" />
                              </Box>
                            </button>
                          </Box>
                        );
                      })}
                    </BlockStack>
                  </Scrollable>
                </Box>
              )}

              {searchQuery.trim() && searchResults.length === 0 && (
                <Box padding="300">
                  <Text as="p" tone="subdued" alignment="center">
                    {applicableTo === 'product'
                      ? 'No se encontraron productos'
                      : 'No se encontraron categorías'}
                  </Text>
                </Box>
              )}

              {applicableIds.length === 0 && (
                <Banner tone="warning">
                  <Text as="span" variant="bodySm">
                    {applicableTo === 'product'
                      ? 'Selecciona al menos un producto para aplicar la promoción.'
                      : 'Selecciona al menos una categoría para aplicar la promoción.'}
                  </Text>
                </Banner>
              )}
            </BlockStack>
          )}`;

const contentToInject = `          {/* Custom Search Box Reused for conditional */}`;

// Let's actually NOT use string replacement here for the entire block because it's prone to whitespace mismatches.
// Instead we'll use a better approach directly substituting the block.
