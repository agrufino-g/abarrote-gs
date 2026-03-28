const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/others/promotions/page.tsx', 'utf8');

const regex = /  return \(\n    <Modal[\s\S]*?(?=^  \);\n\}|\Z)/m;

const newReturn = `  return (
    <Page
      backAction={{ content: 'Promociones', onAction: onClose }}
      title={editing ? 'Editar promoción' : 'Nueva promoción'}
      primaryAction={{
        content: editing ? 'Guardar' : 'Crear promoción',
        onAction: handleSave,
        loading: saving,
        disabled: !canSave,
      }}
    >
      <Layout>
        {/* Main Column */}
        <Layout.Section>
          <BlockStack gap="400">
            
            {/* Información básica */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Información general</Text>
                <TextField
                  label="Nombre de la promoción"
                  value={name}
                  onChange={setName}
                  placeholder="Ej: 2x1 en lácteos, 20% Fin de Semana..."
                  autoComplete="off"
                />
                <TextField
                  label="Descripción (opcional)"
                  value={description}
                  onChange={setDescription}
                  placeholder="Detalles de la promoción para uso interno"
                  multiline={3}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>

            {/* Descuento */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Valor del descuento</Text>
                <ChoiceList
                  title="Tipo"
                  titleHidden
                  choices={[
                    {
                      label: 'Porcentaje de descuento',
                      value: 'percentage',
                      renderChildren: (isSelected) => isSelected && (
                        <Box paddingBlockStart="200" paddingInlineStart="400">
                          <TextField
                            label="Porcentaje (%)"
                            type="number"
                            value={value}
                            onChange={setValue}
                            placeholder="15"
                            autoComplete="off"
                            suffix="%"
                          />
                        </Box>
                      ),
                    },
                    {
                      label: 'Descuento fijo ($)',
                      value: 'fixed',
                      renderChildren: (isSelected) => isSelected && (
                        <Box paddingBlockStart="200" paddingInlineStart="400">
                          <TextField
                            label="Monto ($)"
                            type="number"
                            value={value}
                            onChange={setValue}
                            placeholder="50"
                            autoComplete="off"
                            suffix="MXN"
                          />
                        </Box>
                      ),
                    },
                    { label: 'Compra X lleva Y (BOGO)', value: 'bogo' },
                    { label: 'Paquete / combo', value: 'bundle' },
                  ]}
                  selected={[type]}
                  onChange={(v) => setType(v[0] as PromotionType)}
                />
                
                <Box paddingBlockStart="200">
                  <Divider />
                </Box>
                
                <Text variant="headingSm" as="h3">Requisitos mínimos</Text>
                <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                  <TextField
                    label="Compra mínima ($)"
                    type="number"
                    value={minPurchase}
                    onChange={setMinPurchase}
                    autoComplete="off"
                    prefix="$"
                  />
                  {type === 'percentage' && (
                    <TextField
                      label="Descuento máximo ($)"
                      type="number"
                      value={maxDiscount}
                      onChange={setMaxDiscount}
                      placeholder="Sin límite"
                      autoComplete="off"
                      prefix="$"
                      helpText="Tope máximo de descuento"
                    />
                  )}
                </InlineGrid>
              </BlockStack>
            </Card>

            {/* Productos Aplicables */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Aplica a</Text>
                <ChoiceList
                  title="Aplicable a"
                  titleHidden
                  choices={[
                    { label: 'Todos los productos', value: 'all' },
                    { label: 'Categorías específicas', value: 'category' },
                    { label: 'Productos específicos', value: 'product' },
                  ]}
                  selected={[applicableTo]}
                  onChange={handleApplicableToChange}
                />

                {applicableTo === 'all' && (
                  <Box paddingBlockStart="200">
                    <Banner tone="info">
                      <Text as="span" variant="bodySm">
                        Esta promoción se aplicará automáticamente a todos los productos del catálogo.
                      </Text>
                    </Banner>
                  </Box>
                )}

                {applicableTo !== 'all' && (
                  <BlockStack gap="300">
                    {/* Selected items as tags */}
                    {selectedItems.length > 0 && (
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
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
                          ? 'Buscar por nombre, SKU o código...'
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
                                      padding: '12px 16px',
                                      background: idx % 2 === 0 ? 'transparent' : 'var(--p-color-bg-surface-secondary)',
                                      border: 'none',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <BlockStack gap="0">
                                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                                        {product ? product.name : category?.name ?? ''}
                                      </Text>
                                      {product && (
                                        <Text as="span" variant="bodySm" tone="subdued">
                                          {\`SKU: \${product.sku || 'N/A'} • \${formatCurrency(product.unitPrice)}\`}
                                        </Text>
                                      )}
                                    </BlockStack>
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
                            ? 'Selecciona al menos un producto.'
                            : 'Selecciona al menos una categoría.'}
                        </Text>
                      </Banner>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

          </BlockStack>
        </Layout.Section>

        {/* Sidebar Column */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            {/* Status */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Estado</Text>
                <Checkbox
                  label="Promoción activa"
                  helpText="Si está inactiva, no se aplicará en punto de venta"
                  checked={active}
                  onChange={setActive}
                />
              </BlockStack>
            </Card>

            {/* Vigencia */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Fechas de vigencia</Text>
                <BlockStack gap="300">
                  <TextField
                    label="Fecha de inicio"
                    type="date"
                    value={startDate}
                    onChange={setStartDate}
                    autoComplete="off"
                  />
                  <TextField
                    label="Fecha de fin (opcional)"
                    type="date"
                    value={endDate}
                    onChange={setEndDate}
                    autoComplete="off"
                    clearButton
                    onClearButtonClick={() => setEndDate('')}
                  />
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Limits */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Límites de uso</Text>
                <TextField
                  label="Total de usos"
                  type="number"
                  value={usageLimit}
                  onChange={setUsageLimit}
                  placeholder="Ilimitado"
                  autoComplete="off"
                  helpText="Dejar vacío para uso ilimitado"
                />
              </BlockStack>
            </Card>
            
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );`;

content = content.replace(regex, newReturn);
fs.writeFileSync('src/app/dashboard/others/promotions/page.tsx', content);
console.log("Updated Promotion Form View");
