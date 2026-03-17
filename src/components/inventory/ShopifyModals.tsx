import {
  Modal,
  RadioButton,
  BlockStack,
  Text,
  Link,
  Badge,
  DropZone,
  InlineStack,
  Checkbox,
  Button,
  Icon,
} from '@shopify/polaris';
import {
  ExportIcon,
  NoteIcon,
  QuestionCircleIcon,
  SearchIcon,
} from '@shopify/polaris-icons';
import { useState, useCallback } from 'react';
import { importProductsFromCSV, importCustomersFromCSV } from '@/app/actions/import-actions';
import { useToast } from '@/components/notifications/ToastProvider';

export function ProductImportModal({ open, onClose, onImportSuccess }: { open: boolean, onClose: () => void, onImportSuccess?: () => void }) {
    const [step, setStep] = useState(1);
    const [importOption, setImportOption] = useState('shopify');
    const [file, setFile] = useState<File | null>(null);
    const [overwrite, setOverwrite] = useState(false);
    const [publish, setPublish] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const handleDropZoneDrop = useCallback((_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const handleClose = () => {
        setStep(1);
        setFile(null);
        setOverwrite(false);
        setPublish(true);
        onClose();
    };

    if (step === 2) {
        return (
            <Modal
                open={open}
                onClose={handleClose}
                title="Importar productos por CSV"
                primaryAction={{
                    content: 'Subir y previsualizar',
                    disabled: !file,
                    loading: isSubmitting,
                    onAction: async () => {
                        if (!file) return;
                        setIsSubmitting(true);

                        const formData = new FormData();
                        formData.append('file', file);

                        const res = await importProductsFromCSV(formData, overwrite, publish);
                        setIsSubmitting(false);

                        if (res.success) {
                            toast.showSuccess(res.message);
                            onImportSuccess?.();
                            handleClose();
                        } else {
                            toast.showError(res.message);
                        }
                    },
                }}
                secondaryActions={[
                    {
                        content: 'Cancelar',
                        onAction: handleClose,
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        {!file ? (
                            <DropZone onDrop={handleDropZoneDrop} variableHeight>
                                <DropZone.FileUpload actionTitle="Agregar archivo" />
                            </DropZone>
                        ) : (
                            <InlineStack align="space-between" blockAlign="center">
                                <InlineStack gap="300" blockAlign="center">
                                    <Icon source={NoteIcon} tone="base" />
                                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                                        {file.name}
                                    </Text>
                                </InlineStack>
                                <Button onClick={() => setFile(null)}>Reemplazar archivo</Button>
                            </InlineStack>
                        )}

                        <BlockStack gap="100">
                            <Checkbox
                                label="Sobrescribir productos con identificadores coincidentes."
                                helpText="Se reemplazarán los valores existentes para todas las columnas incluidas en el CSV."
                                checked={overwrite}
                                onChange={setOverwrite}
                            />
                            <Checkbox
                                label="Publicar productos nuevos en todos los canales de ventas."
                                checked={publish}
                                onChange={setPublish}
                            />
                        </BlockStack>

                        <InlineStack align="start">
                            <Link url="https://kiosko-blob.s3.us-east-2.amazonaws.com/formato_inventario_kiosco.csv" target="_blank">
                                Descargar CSV de ejemplo
                            </Link>
                        </InlineStack>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        );
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Importar productos"
            primaryAction={{
                content: 'Siguiente',
                disabled: importOption !== 'shopify',
                onAction: () => setStep(2),
            }}
            secondaryActions={[
                {
                    content: 'Cancelar',
                    onAction: handleClose,
                },
            ]}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Text as="p" variant="bodyMd">¿Cómo quieres importar tus productos?</Text>
                    <RadioButton
                        label="Sube un archivo CSV con formato de Kiosco"
                        helpText={
                            <Text as="span" tone="subdued">
                                Importa un archivo CSV que ya tenga el formato adecuado para encajar con una plantilla de Kiosco.{' '}
                                <Link url="https://kiosko-blob.s3.us-east-2.amazonaws.com/formato_inventario_kiosco.csv" target="_blank">Descargar CSV de ejemplo</Link>
                            </Text>
                        }
                        checked={importOption === 'shopify'}
                        id="import-shopify"
                        onChange={() => setImportOption('shopify')}
                    />
                    <RadioButton
                        label={
                            <InlineStack gap="200" blockAlign="center">
                                <Text as="span" variant="bodyMd">Importar datos desde otra plataforma</Text>
                                <Badge tone="info">No disponible</Badge>
                            </InlineStack>
                        }
                        helpText="Importa una copia de tus datos desde otra plataforma usando una de nuestras apps recomendadas."
                        checked={importOption === 'other'}
                        id="import-other"
                        onChange={() => setImportOption('other')}
                        disabled
                    />
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}

export function ProductExportModal({ open, onClose, onExport }: { open: boolean, onClose: () => void, onExport: (format: string) => void }) {
    const [exportScope, setExportScope] = useState('current');
    const [exportFormat, setExportFormat] = useState('csv');

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Exportar productos"
            primaryAction={{
                content: 'Exportar productos',
                onAction: () => {
                    onExport(exportFormat);
                    onClose();
                },
            }}
            secondaryActions={[
                {
                    content: 'Cancelar',
                    onAction: onClose,
                },
            ]}
            footer={
                <InlineStack align="start" blockAlign="center" gap="100">
                  <Icon source={QuestionCircleIcon} tone="subdued" />
                  <Link url="#" removeUnderline>
                    <Text as="span" variant="bodyMd" tone="base">Leer más</Text>
                  </Link>
                </InlineStack>
            }
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Text as="p" variant="bodyMd">
                        Este archivo CSV puede actualizar toda la información del producto. Para actualizar solo las cantidades de inventario, usa el <Link url="#">Archivo CSV para inventario</Link>.
                    </Text>

                    <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">Exportar</Text>
                        <RadioButton
                            label="Página actual"
                            checked={exportScope === 'current'}
                            id="export-current"
                            onChange={() => setExportScope('current')}
                        />
                        <RadioButton
                            label="Todos los productos"
                            checked={exportScope === 'all'}
                            id="export-all"
                            onChange={() => setExportScope('all')}
                        />
                    </BlockStack>

                    <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">Exportar como</Text>
                        <RadioButton
                            label="CSV para Excel, Numbers u otros programas de hoja de cálculo"
                            checked={exportFormat === 'csv'}
                            id="format-csv"
                            onChange={() => setExportFormat('csv')}
                        />
                        <RadioButton
                            label="Archivo CSV sin formato"
                            checked={exportFormat === 'plain'}
                            id="format-plain"
                            onChange={() => setExportFormat('plain')}
                        />
                        <RadioButton
                            label="Documento PDF (Tablas y reportes visuales)"
                            checked={exportFormat === 'pdf'}
                            id="format-pdf"
                            onChange={() => setExportFormat('pdf')}
                        />
                    </BlockStack>
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}

export function CustomerExportModal({
  open,
  onClose,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'plain' | 'pdf' | string, scope: 'all' | 'current' | string) => void;
}) {
  const [exportScope, setExportScope] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');
  const [includeTags, setIncludeTags] = useState(true);
  const [includeMetafields, setIncludeMetafields] = useState(true);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exportar clientes"
      primaryAction={{
        content: 'Exportar clientes',
        onAction: () => {
          onExport(exportFormat, exportScope);
          onClose();
        },
      }}
      secondaryActions={[
        {
          content: 'Cancelar',
          onAction: onClose,
        },
      ]}
      footer={
        <InlineStack align="start" blockAlign="center" gap="100">
          <Icon source={QuestionCircleIcon} tone="subdued" />
          <Link url="#" removeUnderline>
            <Text as="span" variant="bodyMd" tone="base">Leer más</Text>
          </Link>
        </InlineStack>
      }
    >
      <Modal.Section>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">Clientes seleccionados</Text>
            <RadioButton
              label="Página actual"
              checked={exportScope === 'current'}
              id="export-scope-current"
              onChange={() => setExportScope('current')}
            />
            <RadioButton
              label="Todos los clientes"
              checked={exportScope === 'all'}
              id="export-scope-all"
              onChange={() => setExportScope('all')}
            />
          </BlockStack>

          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">Campos incluidos</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              De forma predeterminada, todas las exportaciones incluyen: nombre completo, Identificación, dirección, correo electrónico, número de teléfono, empresa, consentimiento de marketing, pedidos, exenciones de impuestos.
            </Text>
            <Checkbox
              label="Etiquetas de cliente"
              checked={includeTags}
              onChange={setIncludeTags}
            />
            <Checkbox
              label="Metacampos de cliente"
              checked={includeMetafields}
              onChange={setIncludeMetafields}
            />
          </BlockStack>

          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">Formato de archivo</Text>
            <RadioButton
              label="CSV para Excel, Numbers u otros programas de hojas de cálculo"
              checked={exportFormat === 'csv'}
              id="export-format-csv"
              onChange={() => setExportFormat('csv')}
            />
            <RadioButton
              label="Archivo CSV sin formato"
              checked={exportFormat === 'plain'}
              id="export-format-plain"
              onChange={() => setExportFormat('plain')}
            />
            <RadioButton
              label="Documento PDF (Tablas y reportes visuales)"
              checked={exportFormat === 'pdf'}
              id="export-format-pdf"
              onChange={() => setExportFormat('pdf')}
            />
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

export function GenericExportModal({
    open,
    onClose,
    onExport,
    title = "Exportar datos",
    exportName = "datos"
}: {
    open: boolean,
    onClose: () => void,
    onExport: (format: string) => void,
    title?: string,
    exportName?: string
}) {
    const [exportFormat, setExportFormat] = useState('csv');

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            primaryAction={{
                content: `Exportar ${exportName}`,
                icon: ExportIcon,
                onAction: () => {
                    onExport(exportFormat);
                    onClose();
                },
            }}
            secondaryActions={[
                {
                    content: 'Cancelar',
                    onAction: onClose,
                },
            ]}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">Exportar como</Text>
                        <RadioButton
                            label="CSV para Excel, Numbers u otros programas de hoja de cálculo"
                            checked={exportFormat === 'csv'}
                            id={`gen-format-csv-${exportName}`}
                            onChange={() => setExportFormat('csv')}
                        />
                        <RadioButton
                            label="Documento PDF (Tablas y reportes visuales)"
                            checked={exportFormat === 'pdf'}
                            id={`gen-format-pdf-${exportName}`}
                            onChange={() => setExportFormat('pdf')}
                        />
                    </BlockStack>
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}

export function ClientImportModal({ open, onClose, onImportSuccess }: { open: boolean, onClose: () => void, onImportSuccess?: () => void }) {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const handleDropZoneDrop = useCallback((_dropFiles: File[], acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
        }
    }, []);

    const handleClose = () => {
        setStep(1);
        setFile(null);
        onClose();
    };

    if (step === 2) {
        return (
            <Modal
                open={open}
                onClose={handleClose}
                title="Importar clientes por CSV"
                primaryAction={{
                    content: 'Subir y previsualizar',
                    disabled: !file,
                    loading: isSubmitting,
                    onAction: async () => {
                        if (!file) return;
                        setIsSubmitting(true);
                        
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        const res = await importCustomersFromCSV(formData);
                        setIsSubmitting(false);

                        if (res.success) {
                            toast.showSuccess(res.message);
                            onImportSuccess?.();
                            handleClose();
                        } else {
                            toast.showError(res.message);
                        }
                    },
                }}
                secondaryActions={[{ content: 'Cancelar', onAction: handleClose }]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        {!file ? (
                            <DropZone onDrop={handleDropZoneDrop} variableHeight>
                                <DropZone.FileUpload actionTitle="Agregar archivo" />
                            </DropZone>
                        ) : (
                            <InlineStack align="space-between" blockAlign="center">
                                <InlineStack gap="300" blockAlign="center">
                                    <Icon source={NoteIcon} tone="base" />
                                    <Text as="p" variant="bodyMd" fontWeight="semibold">{file.name}</Text>
                                </InlineStack>
                                <Button onClick={() => setFile(null)}>Reemplazar archivo</Button>
                            </InlineStack>
                        )}
                        <Text as="p" variant="bodyMd" tone="subdued">
                            Esta función de importación de clientes está en fase final de despliegue.
                        </Text>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        );
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Importar clientes"
            primaryAction={{
                content: 'Siguiente',
                onAction: () => setStep(2),
            }}
            secondaryActions={[{ content: 'Cancelar', onAction: handleClose }]}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Text as="p" variant="bodyMd">¿Cómo quieres importar tus clientes?</Text>
                    <RadioButton
                        label="Sube un archivo CSV con tus clientes"
                        helpText={
                            <Text as="span" tone="subdued">
                                Importa un archivo CSV que contenga nombres y teléfonos.
                            </Text>
                        }
                        checked={true}
                        id="import-client-csv"
                        onChange={() => { }}
                    />
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}
