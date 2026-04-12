'use client';

import {
  Card,
  TextField,
  FormLayout,
  BlockStack,
  InlineStack,
  Button,
  Checkbox,
  Box,
  Banner,
  Divider,
  Layout,
} from '@shopify/polaris';
import { ChatIcon } from '@shopify/polaris-icons';
import type { SettingsSectionProps } from './types';

interface NotificationsSectionProps extends SettingsSectionProps {
  tgTesting: boolean;
  tgTestResult: { success: boolean; message: string } | null;
  handleTGTest: () => void;
}

export function NotificationsSection({
  config,
  updateField,
  tgTesting,
  tgTestResult,
  handleTGTest,
}: NotificationsSectionProps) {
  return (
    <BlockStack gap="500">
      <Layout.AnnotatedSection
        title="Integración con Telegram Push"
        description="Recibe eventos críticos (como un stock agotado o el resumen del cierre de caja diario) directamente como un mensaje en tu celular personal o al de tus supervisores."
      >
        <Card>
          <BlockStack gap="400">
            <Checkbox
              label="Activar motor de notificaciones externas"
              helpText="Permite que el sistema envíe llamadas a la API de canales externos."
              checked={config.enableNotifications}
              onChange={(v) => updateField('enableNotifications', v)}
            />

            {config.enableNotifications && (
              <Box paddingBlockStart="300">
                <FormLayout>
                  <TextField
                    label="Telegram Bot Token"
                    value={config.telegramToken || ''}
                    onChange={(v) => updateField('telegramToken', v)}
                    autoComplete="off"
                    type="password"
                    placeholder="123456789:AAHK_..."
                    helpText="Se obtiene creando un bot corporativo usando @BotFather."
                  />
                  <TextField
                    label="Identificador de Chat (Chat ID)"
                    value={config.telegramChatId || ''}
                    onChange={(v) => updateField('telegramChatId', v)}
                    autoComplete="off"
                    placeholder="Ej: -100123456789"
                    helpText="El chat grupal o individual de los gerentes."
                  />
                  <Divider />
                  <InlineStack gap="300" blockAlign="center">
                    <Button onClick={handleTGTest} loading={tgTesting} icon={ChatIcon}>
                      Disparar evento de prueba
                    </Button>
                  </InlineStack>
                  {tgTestResult && (
                    <Banner tone={tgTestResult.success ? 'success' : 'critical'}>
                      <p>{tgTestResult.message}</p>
                    </Banner>
                  )}
                </FormLayout>
              </Box>
            )}
          </BlockStack>
        </Card>
      </Layout.AnnotatedSection>
    </BlockStack>
  );
}
