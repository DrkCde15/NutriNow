import { useState, useCallback, type ChangeEvent } from 'react';

type ValidationRule<T = string> = {
  validate: (value: T, allValues: Record<string, unknown>) => string | undefined;
  message: string;
};

type FormFieldConfig = {
  initial: string;
  rules?: ValidationRule[];
};

type Fields = Record<string, FormFieldConfig>;

export function useForm<T extends Fields>(config: T) {
  const [state, setState] = useState(() => {
    const s: Record<string, { value: string; error: string; touched: boolean }> = {};
    for (const key in config) {
      s[key] = { value: config[key].initial, error: '', touched: false };
    }
    return s;
  });

  const validateField = useCallback(
    (key: string, value: string) => {
      const rules = config[key]?.rules;
      if (!rules) return '';
      const allValues = Object.fromEntries(
        Object.entries(state).map(([k, v]) => [k, v.value])
      );
      for (const rule of rules) {
        const err = rule.validate(value, allValues);
        if (err) return err;
      }
      return '';
    },
    [config, state]
  );

  const setValue = useCallback(
    (key: string, value: string) => {
      setState(prev => {
        const error = validateField(key, value);
        return { ...prev, [key]: { value, error, touched: prev[key].touched } };
      });
    },
    [validateField]
  );

  const setTouched = useCallback((key: string) => {
    setState(prev => ({ ...prev, [key]: { ...prev[key], touched: true } }));
  }, []);

  const setFieldError = useCallback((key: string, error: string) => {
    setState(prev => ({ ...prev, [key]: { ...prev[key], error, touched: true } }));
  }, []);

  const handleChange = useCallback(
    (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValue(key, e.target.value);
    },
    [setValue]
  );

  const handleBlur = useCallback(
    (key: string) => () => setTouched(key),
    [setTouched]
  );

  const validateAll = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    let valid = true;
    const allValues = Object.fromEntries(
      Object.entries(state).map(([k, v]) => [k, v.value])
    );

    for (const key in config) {
      const value = state[key].value;
      const rules = config[key]?.rules;
      if (rules) {
        for (const rule of rules) {
          const err = rule.validate(value, allValues);
          if (err) {
            errors[key] = err;
            valid = false;
            break;
          }
        }
      }
    }

    setState(prev => {
      const next = { ...prev };
      for (const key in config) {
        next[key] = { ...next[key], error: errors[key] || '', touched: true };
      }
      return next;
    });

    return valid;
  }, [config, state]);

  const reset = useCallback(() => {
    setState(prev => {
      const next = { ...prev };
      for (const key in config) {
        next[key] = { value: config[key].initial, error: '', touched: false };
      }
      return next;
    });
  }, [config]);

  const getValues = useCallback((): Record<string, unknown> => {
    return Object.fromEntries(
      Object.entries(state).map(([k, v]) => [k, v.value])
    );
  }, [state]);

  return {
    values: Object.fromEntries(Object.entries(state).map(([k, v]) => [k, v.value])) as Record<string, string>,
    errors: Object.fromEntries(Object.entries(state).map(([k, v]) => [k, v.error])) as Record<string, string>,
    touched: Object.fromEntries(Object.entries(state).map(([k, v]) => [k, v.touched])) as Record<string, boolean>,
    setValue,
    setTouched,
    setFieldError,
    handleChange,
    handleBlur,
    validateAll,
    getValues,
    reset,
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export const validators = {
  required: (msg = 'Campo obrigatório'): ValidationRule => ({
    validate: (v) => (v ? undefined : msg),
    message: msg,
  }),

  email: (msg = 'Email inválido'): ValidationRule => ({
    validate: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : msg),
    message: msg,
  }),

  minLength: (min: number, msg?: string): ValidationRule => ({
    validate: (v) => (v && v.length < min ? msg ?? `Mínimo ${min} caracteres` : undefined),
    message: msg ?? `Mínimo ${min} caracteres`,
  }),

  match: (fieldName: string, msg?: string): ValidationRule => ({
    validate: (v, all) => (v !== all[fieldName] ? msg ?? `Deve ser igual` : undefined),
    message: msg ?? `Deve ser igual`,
  }),

  numberRange: (min: number, max: number, msg?: string): ValidationRule => ({
    validate: (v) => {
      if (!v) return undefined;
      const n = Number(v);
      return n >= min && n <= max ? undefined : msg ?? `Deve estar entre ${min} e ${max}`;
    },
    message: msg ?? `Deve estar entre ${min} e ${max}`,
  }),

  password: (msg?: string): ValidationRule => ({
    validate: (v) => {
      if (!v) return msg ?? 'Informe a senha';
      if (v.length < 10) return 'Senha deve ter ao menos 10 caracteres';
      if (!/[A-Z]/.test(v)) return 'Senha deve conter ao menos uma letra maiúscula';
      if (!/[a-z]/.test(v)) return 'Senha deve conter ao menos uma letra minúscula';
      if (!/[0-9]/.test(v)) return 'Senha deve conter ao menos um número';
      return undefined;
    },
    message: msg ?? 'Senha não atende aos requisitos',
  }),
};
