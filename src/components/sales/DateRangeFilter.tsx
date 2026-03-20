'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Button,
  InlineStack,
  InlineGrid,
  Popover,
  DatePicker,
  OptionList,
  Box,
  Icon,
  Scrollable,
  TextField,
  BlockStack,
} from '@shopify/polaris';
import { CalendarIcon, ArrowRightIcon } from '@shopify/polaris-icons';

// ── Date helpers ─────────────────────────────────────────────────────────────
const VALID_DATE_RE = /^\d{4}-\d{1,2}-\d{1,2}/;

function isValidDate(v: string) {
  return v.length === 10 && VALID_DATE_RE.test(v) && !isNaN(new Date(v).getDate());
}
function parseDate(v: string) {
  const [y, m, d] = v.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtDisplay(d: Date) {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
function nodeContains(root: Node, desc: Node): boolean {
  if (root === desc) return true;
  let p = desc.parentNode;
  while (p) { if (p === root) return true; p = p.parentNode; }
  return false;
}

// ── Types ────────────────────────────────────────────────────────────────────
export type DateRange = { since: Date; until: Date };
export type RangeOption = { title: string; alias: string; period: DateRange };

export interface DateRangeFilterProps {
  activeDateRange: RangeOption | null;
  onApply: (range: RangeOption | null) => void;
  onClear: () => void;
}

export function DateRangeFilter({ activeDateRange, onApply, onClear }: DateRangeFilterProps) {
  const today     = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);
  const yesterday = useMemo(() => new Date(new Date(today).setDate(today.getDate() - 1)), [today]);

  const ranges: RangeOption[] = useMemo(() => [
    { title: 'Hoy',             alias: 'today',     period: { since: today,     until: today } },
    { title: 'Ayer',            alias: 'yesterday',  period: { since: yesterday, until: yesterday } },
    { title: 'Últimos 7 días',  alias: 'last7',      period: { since: new Date(new Date(today).setDate(today.getDate() - 6)), until: today } },
    { title: 'Últimos 30 días', alias: 'last30',     period: { since: new Date(new Date(today).setDate(today.getDate() - 29)), until: today } },
  ], [today, yesterday]);

  const [popoverActive, setPopoverActive] = useState(false);
  const [pendingRange,  setPendingRange]  = useState<RangeOption | null>(null);
  const [inputValues,   setInputValues]   = useState<{ since: string; until: string }>({ since: '', until: '' });
  const [{ month, year }, setCalDate]     = useState({ month: today.getMonth(), year: today.getFullYear() });
  const datePickerRef = useRef<HTMLDivElement>(null);

  // sync inputs when pending range changes
  useEffect(() => {
    if (!pendingRange) return;
    setInputValues({ since: fmtDate(pendingRange.period.since), until: fmtDate(pendingRange.period.until) });
    const until = pendingRange.period.until;
    setCalDate({ month: until.getMonth(), year: until.getFullYear() });
  }, [pendingRange]);

  // when popover opens, seed pending from active
  useEffect(() => {
    if (popoverActive) {
      setPendingRange(activeDateRange ?? ranges[0]);
    }
  }, [popoverActive]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartInput(value: string) {
    setInputValues(p => ({ ...p, since: value }));
    if (!isValidDate(value)) return;
    const newSince = parseDate(value);
    setPendingRange(prev => {
      const until = prev?.period.until ?? newSince;
      const period = newSince <= until ? { since: newSince, until } : { since: newSince, until: newSince };
      return { alias: 'custom', title: 'Personalizado', period };
    });
  }

  function handleEndInput(value: string) {
    setInputValues(p => ({ ...p, until: value }));
    if (!isValidDate(value)) return;
    const newUntil = parseDate(value);
    setPendingRange(prev => {
      const since = prev?.period.since ?? newUntil;
      const period = newUntil >= since ? { since, until: newUntil } : { since: newUntil, until: newUntil };
      return { alias: 'custom', title: 'Personalizado', period };
    });
  }

  function handleCalendarChange({ start, end }: { start: Date; end: Date }) {
    const found = ranges.find(r => r.period.since.valueOf() === start.valueOf() && r.period.until.valueOf() === end.valueOf());
    setPendingRange(found ?? { alias: 'custom', title: 'Personalizado', period: { since: start, until: end } });
  }

  function handleInputBlur({ relatedTarget }: React.FocusEvent) {
    const within = relatedTarget instanceof Node && datePickerRef.current
      ? nodeContains(datePickerRef.current, relatedTarget) : false;
    if (!within) return;
  }

  function handleApply() {
    onApply(pendingRange);
    setPopoverActive(false);
  }

  function handleCancel() {
    setPopoverActive(false);
  }

  // button label
  const dateButtonLabel = activeDateRange
    ? activeDateRange.alias === 'custom'
      ? `${fmtDisplay(activeDateRange.period.since)} → ${fmtDisplay(activeDateRange.period.until)}`
      : activeDateRange.title
    : 'Fecha';

  return (
    <InlineStack gap="200" blockAlign="center" wrap={false}>
      <Popover
        active={popoverActive}
        autofocusTarget="none"
        preferredAlignment="right"
        preferredPosition="below"
        fluidContent
        sectioned={false}
        fullHeight
        onClose={() => setPopoverActive(false)}
        activator={
          <Button
            icon={CalendarIcon}
            onClick={() => setPopoverActive(v => !v)}
            disclosure
            tone={activeDateRange ? 'success' : undefined}
            variant="plain"
          >
            {dateButtonLabel}
          </Button>
        }
      >
        <Popover.Pane fixed>
          <div ref={datePickerRef}>
            <InlineGrid columns={{ xs: '1fr', md: 'max-content max-content' }} gap="0">
              <Box width="212px" padding="0" paddingBlockEnd="0">
                <Scrollable style={{ height: '334px' }}>
                  <OptionList
                    options={ranges.map(r => ({ value: r.alias, label: r.title }))}
                    selected={pendingRange ? [pendingRange.alias] : []}
                    onChange={(vals) => {
                      const found = ranges.find(r => r.alias === vals[0]);
                      if (found) setPendingRange(found);
                    }}
                  />
                </Scrollable>
              </Box>
              <Box padding="500" maxWidth="516px">
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <div style={{ flexGrow: 1 }}>
                      <TextField
                        role="combobox" label="Desde" labelHidden
                        prefix={<Icon source={CalendarIcon} />}
                        value={inputValues.since} onChange={handleStartInput}
                        onBlur={handleInputBlur} autoComplete="off"
                      />
                    </div>
                    <Icon source={ArrowRightIcon} />
                    <div style={{ flexGrow: 1 }}>
                      <TextField
                        role="combobox" label="Hasta" labelHidden
                        prefix={<Icon source={CalendarIcon} />}
                        value={inputValues.until} onChange={handleEndInput}
                        onBlur={handleInputBlur} autoComplete="off"
                      />
                    </div>
                  </InlineStack>
                  <DatePicker
                    month={month} year={year}
                    selected={pendingRange ? { start: pendingRange.period.since, end: pendingRange.period.until } : undefined}
                    onMonthChange={(m, y) => setCalDate({ month: m, year: y })}
                    onChange={({ start, end }) => handleCalendarChange({ start, end })}
                    multiMonth allowRange weekStartsOn={0}
                  />
                </BlockStack>
              </Box>
            </InlineGrid>
          </div>
        </Popover.Pane>
        <Popover.Pane fixed>
          <Popover.Section>
            <InlineStack align="end" gap="200">
              <Button onClick={handleCancel}>Cancelar</Button>
              <Button variant="primary" onClick={handleApply}>Aplicar</Button>
            </InlineStack>
          </Popover.Section>
        </Popover.Pane>
      </Popover>

      {activeDateRange && (
        <Button variant="plain" tone="critical" onClick={onClear}>Limpiar</Button>
      )}
    </InlineStack>
  );
}
