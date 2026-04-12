'use client';

import { useState, useCallback, useMemo } from 'react';
import { Autocomplete, Icon } from '@shopify/polaris';
import { SearchIcon } from '@shopify/polaris-icons';

interface Option {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  label: string;
  options: Option[];
  selected?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helpText?: string;
  labelHidden?: boolean;
}

export function SearchableSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Buscar...',
  error,
  helpText,
  labelHidden,
}: SearchableSelectProps) {
  const [inputValue, setInputValue] = useState('');

  // Sync input value with selection changes from parent (e.g. clearing after add)
  const [lastSelected, setLastSelected] = useState(selected);
  if (selected !== lastSelected) {
    setLastSelected(selected);
    if (!selected) {
      setInputValue('');
    } else {
      const selectedOption = options.find((opt) => opt.value === selected);
      if (selectedOption) {
        setInputValue(selectedOption.label);
      }
    }
  }

  // Derive filtered options from props + input — always up to date
  const filteredOptions = useMemo(() => {
    if (inputValue === '') return options;
    const filterRegex = new RegExp(inputValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return options.filter((option) => option.label.match(filterRegex));
  }, [options, inputValue]);

  const updateText = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const updateSelection = useCallback(
    (selection: string[]) => {
      const nextSelected = selection[0];
      onChange(nextSelected);

      const selectedOption = options.find((opt) => opt.value === nextSelected);
      if (selectedOption) {
        setInputValue(selectedOption.label);
      }
    },
    [options, onChange],
  );

  const displayValue = inputValue;

  const textField = (
    <Autocomplete.TextField
      onChange={updateText}
      label={label}
      labelHidden={labelHidden}
      value={displayValue}
      placeholder={placeholder}
      prefix={<Icon source={SearchIcon} tone="subdued" />}
      autoComplete="off"
      error={error}
      helpText={helpText}
    />
  );

  return (
    <Autocomplete
      options={filteredOptions}
      selected={selected ? [selected] : []}
      onSelect={updateSelection}
      textField={textField}
    />
  );
}
