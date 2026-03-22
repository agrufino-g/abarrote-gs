'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  FormLayout,
  TextField,
  Checkbox,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Box,
  DropZone,
  Thumbnail,
  Divider,
} from '@shopify/polaris';
import { FormSelect } from '@/components/ui/FormSelect';
import { uploadFile, getProductImagePath } from '@/lib/storage';
import { useDashboardStore } from '@/store/dashboardStore';
import { useToast } from '@/components/notifications/ToastProvider';
import { CameraScanner } from '@/components/scanner/CameraScanner';
import { Product } from '@/types';

interface UpdateProductModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

const categoryOptions = [
  { label: 'Seleccionar categoría...', value: '' },
  { label: 'Lácteos', value: 'lacteos' },
  { label: 'Panadería', value: 'panaderia' },
  { label: 'Huevo', value: 'huevo' },
  { label: 'Botanas', value: 'botanas' },
  { label: 'Bebidas', value: 'bebidas' },
  { label: 'Limpieza', value: 'limpieza' },
  { label: 'Abarrotes', value: 'abarrotes' },
  { label: 'Frutas y Verduras', value: 'frutas_verduras' },
  { label: 'Carnes', value: 'carnes' },
  { label: 'Otros', value: 'otros' },
];

const unitOptions = [
  { label: 'Pieza', value: 'pieza' },
  { label: 'Kilo (kg)', value: 'kilo' },
  { label: 'Gramo (g)', value: 'gramo' },
  { label: 'Litro (L)', value: 'litro' },
  { label: 'Paquete', value: 'paquete' },
  { label: 'Caja', value: 'caja' },
  { label: 'Bulto', value: 'bulto' },
];

export function UpdateProductModal({ open, onClose, product }: UpdateProductModalProps) {
  const updateProductStore = useDashboardStore((s) => s.updateProduct);
  const storeConfig = useDashboardStore((s) => s.storeConfig);
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [unit, setUnit] = useState('pieza');
  const [unitMultiple, setUnitMultiple] = useState('1');
  const [currentStock, setCurrentStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [isPerishable, setIsPerishable] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setBarcode(product.barcode || '');
      setCategory(product.category || '');
      setUnitPrice(product.unitPrice?.toString() || '');
      setCostPrice(product.costPrice?.toString() || '');
      setUnit(product.unit || 'pieza');
      setUnitMultiple(product.unitMultiple?.toString() || '1');
      setCurrentStock(product.currentStock?.toString() || '0');
      setMinStock(product.minStock?.toString() || '0');
      setExpirationDate(product.expirationDate || '');
      setIsPerishable(product.isPerishable || false);
      setFile(null);
      setErrors({});
    }
  }, [product]);

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) =>
      setFile(acceptedFiles[0]),
    [],
  );

  const fileUploadMarkup = !file && !product?.imageUrl && <DropZone.FileUpload actionHint="Archivos permitidos: .jpg, .png, .gif" />;
  const uploadedFileMarkup = (file || product?.imageUrl) && (
    <InlineStack gap="300" blockAlign="center">
      <Thumbnail
        size="small"
        key={product?.imageUrl}
        alt={file ? file.name : product?.name || ''}
        source={file ? window.URL.createObjectURL(file) : product?.imageUrl || ''}
      />
      <div>
        {file ? file.name : 'Imagen actual'}{' '}
        <Text variant="bodySm" as="span" tone="subdued">
          {file ? `${file.size} bytes` : ''}
        </Text>
      </div>
    </InlineStack>
  );

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!sku.trim()) newErrors.sku = 'El SKU es obligatorio';
    if (!category) newErrors.category = 'Selecciona una categoría';
    if (!costPrice || parseFloat(costPrice) <= 0) newErrors.costPrice = 'Ingresa un precio de costo válido';
    if (!unitPrice || parseFloat(unitPrice) <= 0) newErrors.unitPrice = 'Ingresa un precio de venta válido';
    if (!currentStock || parseInt(currentStock) < 0) newErrors.currentStock = 'Ingresa un stock válido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, sku, category, costPrice, unitPrice, currentStock]);

  const handleCostPriceChange = useCallback((value: string) => {
    setCostPrice(value);
    const cost = parseFloat(value);
    if (!isNaN(cost) && cost > 0) {
      const defaultMargin = parseFloat(storeConfig.defaultMargin || '30');
      const calculatedPrice = cost + (cost * (defaultMargin / 100));
      setUnitPrice(calculatedPrice.toFixed(2));
    }
  }, [storeConfig.defaultMargin]);

  const margin = parseFloat(unitPrice) > 0 && parseFloat(costPrice) > 0
    ? (((parseFloat(unitPrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(1)
    : null;

  // --- Auto Save Logic ---
  const autoSave = useCallback(async (field: string, value: any) => {
    if (!product) return;
    
    // Básica validación local antes de mandar al server si el campo es crítico
    if (field === 'name' && !value.trim()) return;
    if (field === 'costPrice' && (parseFloat(value) <= 0 || isNaN(parseFloat(value)))) return;
    if (field === 'unitPrice' && (parseFloat(value) <= 0 || isNaN(parseFloat(value)))) return;

    try {
      // Usamos la acción del STORE (Zustand) que ya incluye la actualización optimista
      // Esto hace que el cambio sea instantáneo en la UI sin recargar.
      await updateProductStore(product.id, { [field]: value });
    } catch (err) {
      console.error('Error auto-saving:', err);
    }
  }, [product, updateProductStore]);

  // Manejador especial para la imagen (subida inmediata)
  const handleImageUpload = useCallback(async (newFile: File) => {
    if (!product) return;
    setUploading(true);
    try {
      const path = getProductImagePath(sku || product.id, newFile.name);
      const imageUrl = await uploadFile(newFile, path);
      
      // Actualizamos el store inmediatamente
      await updateProductStore(product.id, { imageUrl });
      showSuccess('Imagen actualizada');
    } catch (err) {
      showError('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  }, [product, sku, updateProductStore, showSuccess, showError]);

  useEffect(() => {
    if (file) {
      handleImageUpload(file);
      setFile(null);
    }
  }, [file, handleImageUpload]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? `Editando: ${product.name}` : 'Editar Producto'}
      primaryAction={{
        content: 'Listo',
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner tone="info">
            <p>Los cambios se guardan <b>automáticamente</b> mientras editas.</p>
          </Banner>

          <Text as="h3" variant="headingMd">Imagen del producto</Text>
          <Box padding="200" borderStyle="dashed" borderWidth="025" borderColor="border" borderRadius="200">
            <DropZone
              onDrop={handleDropZoneDrop}
              variableHeight
              label="Foto del producto"
              labelHidden
              accept="image/*"
              type="image"
              disabled={uploading}
            >
              {uploadedFileMarkup}
              {fileUploadMarkup}
            </DropZone>
          </Box>

          <Divider />

          <Text as="h3" variant="headingMd">Información del producto</Text>

          <FormLayout>
            <FormLayout.Group>
              <TextField 
                label="Nombre" 
                value={name} 
                onChange={setName} 
                onBlur={() => autoSave('name', name.trim())}
                autoComplete="off" 
              />
              <TextField 
                label="SKU" 
                value={sku} 
                onChange={setSku} 
                onBlur={() => autoSave('sku', sku.trim())}
                autoComplete="off" 
              />
            </FormLayout.Group>

            <FormLayout.Group>
            <TextField 
              label="Código de barras" 
              value={barcode} 
              onChange={setBarcode} 
              onBlur={() => autoSave('barcode', barcode.trim())}
              autoComplete="off" 
            />
            <CameraScanner
              onScan={(code) => {
                setBarcode(code);
                autoSave('barcode', code);
              }}
              buttonLabel="Escanear"
              compact
            />
            </FormLayout.Group>

            <FormSelect 
              label="Categoría" 
              options={categoryOptions} 
              value={category} 
              onChange={(v) => {
                setCategory(v);
                autoSave('category', v);
              }} 
            />

            <FormLayout.Group>
              <TextField 
                label="Costo" 
                type="number" 
                value={costPrice} 
                onChange={handleCostPriceChange} 
                onBlur={() => autoSave('costPrice', parseFloat(costPrice))}
                autoComplete="off" 
                prefix="$" 
              />
              <TextField 
                label="Venta" 
                type="number" 
                value={unitPrice} 
                onChange={setUnitPrice} 
                onBlur={() => autoSave('unitPrice', parseFloat(unitPrice))}
                autoComplete="off" 
                prefix="$" 
                helpText={margin ? `Margen: ${margin}%` : ''} 
              />
              <FormSelect 
                label="Unidad" 
                options={unitOptions} 
                value={unit} 
                onChange={(v) => {
                  setUnit(v);
                  autoSave('unit', v);
                }} 
              />
            </FormLayout.Group>

            <FormLayout.Group>
              <TextField 
                label="Stock actual" 
                type="number" 
                value={currentStock} 
                onChange={setCurrentStock} 
                onBlur={() => autoSave('currentStock', parseInt(currentStock, 10))}
                autoComplete="off" 
              />
              <TextField 
                label="Stock mínimo" 
                type="number" 
                value={minStock} 
                onChange={setMinStock} 
                onBlur={() => autoSave('minStock', parseInt(minStock, 10))}
                autoComplete="off" 
              />
            </FormLayout.Group>

            <Checkbox 
              label="Producto perecedero" 
              checked={isPerishable} 
              onChange={(v) => {
                setIsPerishable(v);
                autoSave('isPerishable', v);
              }} 
            />
            {isPerishable && (
              <TextField 
                label="Vencimiento" 
                type="date" 
                value={expirationDate} 
                onChange={setExpirationDate} 
                onBlur={() => autoSave('expirationDate', expirationDate)}
                autoComplete="off" 
              />
            )}
          </FormLayout>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
