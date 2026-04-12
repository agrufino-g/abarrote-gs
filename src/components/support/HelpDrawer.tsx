'use client';

import { useState, useCallback } from 'react';
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  Card,
  Icon,
  Button,
  TextField,
  Divider,
  Box,
  Badge,
} from '@shopify/polaris';
import {
  QuestionCircleIcon,
  EmailIcon,
  ChatIcon,
  ExternalIcon,
} from '@shopify/polaris-icons';

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: '¿Cómo registro una venta?',
    answer:
      'Ve a "Punto de Venta" desde el menú lateral. Agrega productos escaneando su código de barras o buscándolos por nombre. Selecciona el método de pago y presiona "Cobrar".',
  },
  {
    question: '¿Cómo agrego un producto nuevo?',
    answer:
      'Ve a "Productos" → clic en "Agregar producto". Completa nombre, precio, SKU y stock inicial. Opcionalmente puedes subir una imagen y asignar una categoría.',
  },
  {
    question: '¿Qué hago si el internet se cae?',
    answer:
      'El sistema funciona en modo offline automáticamente. Las ventas se guardan localmente y se sincronizan cuando vuelva la conexión. Verás un indicador naranja mientras estés offline.',
  },
  {
    question: '¿Cómo hago un corte de caja?',
    answer:
      'Ve a "Caja" → "Corte de Caja". El sistema calcula automáticamente el efectivo esperado. Ingresa el efectivo contado y el sistema mostrará la diferencia.',
  },
  {
    question: '¿Cómo configuro los métodos de pago?',
    answer:
      'Ve a "Configuración" → sección de pagos. Puedes habilitar MercadoPago (tarjeta y QR), Stripe, Conekta, Clip, o transferencia SPEI. Cada proveedor requiere sus credenciales API.',
  },
  {
    question: '¿Cómo registro una devolución?',
    answer:
      'En "Historial de Ventas", busca la venta y presiona "Devolver". Selecciona los artículos a devolver y confirma. El stock se reajusta automáticamente.',
  },
  {
    question: '¿Cómo funciona el sistema de fiado?',
    answer:
      'Ve a "Clientes" → selecciona un cliente → "Nuevo Fiado". Se registra la deuda y el cliente puede abonar parcialmente. Verás el saldo pendiente en su perfil.',
  },
  {
    question: '¿Cómo exporto mis datos?',
    answer:
      'Desde el Dashboard o Historial de Ventas, presiona el ícono de exportar. Puedes exportar en formato CSV o Excel con filtros por fecha.',
  },
];

export function HelpDrawer({ open, onClose }: HelpDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  const filteredFaq = FAQ_ITEMS.filter(
    (item) =>
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggleFaq = useCallback((index: number) => {
    setExpandedFaq((prev) => (prev === index ? null : index));
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!contactMessage.trim()) return;
    // In production, this would send to a support system
    setMessageSent(true);
    setContactMessage('');
    setTimeout(() => setMessageSent(false), 4000);
  }, [contactMessage]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setExpandedFaq(null);
    setContactMessage('');
    setMessageSent(false);
    onClose();
  }, [onClose]);

  return (
    <Modal open={open} onClose={handleClose} title="Centro de Ayuda" size="large">
      <Modal.Section>
        <BlockStack gap="500">
          {/* Search */}
          <TextField
            label="Buscar en la ayuda"
            labelHidden
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="¿Cómo hago un corte de caja?"
            autoComplete="off"
            clearButton
            onClearButtonClick={() => setSearchQuery('')}
          />

          {/* Quick links */}
          <InlineStack gap="200" wrap>
            <Button
              url="https://github.com/OWSSamples/abarrote-gs/wiki"
              external
              icon={ExternalIcon}
              size="slim"
            >
              Documentación
            </Button>
            <Button
              url="https://github.com/OWSSamples/abarrote-gs/issues/new"
              external
              icon={ChatIcon}
              size="slim"
            >
              Reportar problema
            </Button>
          </InlineStack>

          <Divider />

          {/* FAQ */}
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Preguntas Frecuentes
              </Text>
              <Badge tone="info">{String(filteredFaq.length)}</Badge>
            </InlineStack>

            {filteredFaq.length === 0 && (
              <Box padding="400">
                <Text as="p" tone="subdued" alignment="center">
                  No se encontraron resultados para &quot;{searchQuery}&quot;
                </Text>
              </Box>
            )}

            {filteredFaq.map((faq, idx) => (
              <Card key={idx} padding="300">
                <BlockStack gap="200">
                  <button
                    type="button"
                    onClick={() => handleToggleFaq(idx)}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                    }}
                  >
                    <Icon source={QuestionCircleIcon} tone="info" />
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {faq.question}
                    </Text>
                    <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#6d7175' }}>
                      {expandedFaq === idx ? '▲' : '▼'}
                    </span>
                  </button>
                  {expandedFaq === idx && (
                    <Box paddingInlineStart="600">
                      <Text as="p" variant="bodySm" tone="subdued">
                        {faq.answer}
                      </Text>
                    </Box>
                  )}
                </BlockStack>
              </Card>
            ))}
          </BlockStack>

          <Divider />

          {/* Contact form */}
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={EmailIcon} tone="base" />
              <Text as="h2" variant="headingMd">
                Contactar Soporte
              </Text>
            </InlineStack>

            {messageSent ? (
              <Card>
                <Box padding="300">
                  <Text as="p" tone="success" alignment="center">
                    ✓ Mensaje enviado. Te responderemos pronto.
                  </Text>
                </Box>
              </Card>
            ) : (
              <BlockStack gap="200">
                <TextField
                  label="Describe tu problema o pregunta"
                  value={contactMessage}
                  onChange={setContactMessage}
                  multiline={3}
                  autoComplete="off"
                  placeholder="Describe tu problema con el mayor detalle posible..."
                />
                <InlineStack align="end">
                  <Button
                    variant="primary"
                    onClick={handleSendMessage}
                    disabled={!contactMessage.trim()}
                  >
                    Enviar mensaje
                  </Button>
                </InlineStack>
              </BlockStack>
            )}
          </BlockStack>

          {/* Keyboard shortcut hint */}
          <Box paddingBlockStart="200">
            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
              Presiona <kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid #c9cccf', fontSize: '11px' }}>?</kbd> en cualquier pantalla para abrir esta ayuda
            </Text>
          </Box>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
