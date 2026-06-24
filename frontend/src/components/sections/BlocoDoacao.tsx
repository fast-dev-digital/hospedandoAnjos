import { useMemo, useState } from 'react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { isValidPhoneNumber } from 'libphonenumber-js';
import type { DonationType } from '@shared/checkout-contract';
import { createCheckout } from '@/lib/checkout';
import {
  ANCHORS_CENTS,
  MIN_CENTS,
  formatBRL,
  formatBRLShort,
  isValidAmount,
  parseToCents,
} from '@/lib/donation';
import { Heart } from '@/components/brand/Decor';

export function BlocoDoacao() {
  const [type, setType] = useState<DonationType>('recorrente');
  const [amountText, setAmountText] = useState('20');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappTyped, setWhatsappTyped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cents = useMemo(() => parseToCents(amountText), [amountText]);
  const amountOk = isValidAmount(type, cents);
  const whatsappValid = whatsapp.trim() !== '' && isValidPhoneNumber(whatsapp);
  const formValid =
    amountOk && name.trim() !== '' && email.trim() !== '' && whatsappValid;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formValid) {
      setError(
        `Valor mínimo para doação ${type}: ${formatBRL(MIN_CENTS[type])}.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const { checkoutUrl } = await createCheckout({
        type,
        amountInCents: cents,
        name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
      });
      window.location.href = checkoutUrl; // redirect para o Stripe Checkout hospedado
    } catch {
      setError('Não foi possível iniciar o pagamento. Tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <section id="doar" className="px-5 py-20">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-gold/30 bg-cream-deep/60 p-6 shadow-warm sm:p-9">
          <div className="text-center">
            <Heart className="mx-auto mb-3 w-6 text-gold" />
            <h2 className="font-display text-3xl font-bold text-navy sm:text-4xl">
              Faça sua doação
            </h2>
            <p className="mt-2 text-ink-soft">
              Leva menos de um minuto. Você escolhe o valor.
            </p>
          </div>

          {/* Toggle recorrente / avulsa */}
          <div className="mt-7 grid grid-cols-2 gap-2 rounded-full bg-cream p-1.5">
            <TypeOption
              active={type === 'recorrente'}
              onClick={() => setType('recorrente')}
              title="Mensal"
              subtitle="recorrente"
            />
            <TypeOption
              active={type === 'avulsa'}
              onClick={() => setType('avulsa')}
              title="Única"
              subtitle="avulsa"
            />
          </div>

          {/* Formas de pagamento por tipo (reflete o toggle — FRONT-END-CONTEXT §6).
              recorrente → só cartão; avulsa → cartão ou PIX. */}
          <p
            aria-live="polite"
            className="mt-2.5 text-center text-xs text-ink-soft"
          >
            {type === 'recorrente'
              ? 'Pagamento no cartão de crédito.'
              : 'Pagamento no cartão de crédito ou via PIX.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Âncoras de valor */}
            <div className="grid grid-cols-3 gap-2">
              {ANCHORS_CENTS.map((value) => {
                const active = cents === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmountText(String(value / 100))}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-bold transition-colors ${
                      active
                        ? 'border-navy bg-navy text-cream'
                        : 'border-gold/40 bg-cream text-navy hover:border-navy'
                    }`}
                  >
                    {formatBRLShort(value)}
                  </button>
                );
              })}
            </div>

            {/* Valor livre (mesmo campo das âncoras) */}
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">
                Outro valor
              </span>
              <div className="flex items-center rounded-xl border border-gold/40 bg-cream px-4 focus-within:border-navy">
                <span className="font-bold text-navy">R$</span>
                <input
                  inputMode="decimal"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  className="w-full bg-transparent px-2 py-3 text-lg font-bold text-navy outline-none"
                  aria-label="Valor da doação em reais"
                />
                {type === 'recorrente' && (
                  <span className="text-sm text-ink-soft">/mês</span>
                )}
              </div>
              {cents > 0 && !amountOk && (
                <span
                  role="alert"
                  className="mt-1.5 block text-sm font-semibold text-prism-red"
                >
                  Valor mínimo para doação {type}: {formatBRL(MIN_CENTS[type])}
                  {type === 'recorrente' ? '/mês' : ''}.
                </span>
              )}
            </label>

            <Field
              label="Nome completo"
              value={name}
              onChange={setName}
              autoComplete="name"
            />
            <Field
              label="E-mail"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">
                WhatsApp (com código do país)
              </span>
              <PhoneInput
                defaultCountry="br"
                value={whatsapp}
                onChange={(phone, meta) => {
                  setWhatsapp(phone);
                  const nationalDigits =
                    phone.replace(/\D/g, '').length - meta.country.dialCode.length;
                  setWhatsappTyped(nationalDigits > 0);
                }}
                className="phone-doacao"
                inputProps={{ autoComplete: 'tel', 'aria-label': 'WhatsApp com código do país' }}
              />
              {whatsappTyped && !whatsappValid && (
                <span
                  role="alert"
                  className="mt-1.5 block text-sm font-semibold text-prism-red"
                >
                  Número de WhatsApp inválido para o país selecionado.
                </span>
              )}
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-prism-red/10 px-3 py-2 text-sm font-semibold text-prism-red"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !formValid}
              className="w-full rounded-full bg-navy py-4 text-base font-bold text-cream shadow-warm transition-transform enabled:hover:-translate-y-0.5 enabled:hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Redirecionando…'
                : `Doar ${formatBRL(amountOk ? cents : MIN_CENTS[type])}${
                    type === 'recorrente' ? '/mês' : ''
                  }`}
            </button>

            <p className="text-center text-xs text-ink-soft">
              Pagamento seguro processado pela Stripe. Você será redirecionado
              para concluir.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

function TypeOption({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-3 text-center transition-colors ${
        active ? 'bg-navy text-cream shadow-warm' : 'text-ink/70 hover:text-navy'
      }`}
    >
      <span className="block text-sm font-bold">{title}</span>
      <span className="block text-xs uppercase tracking-wide opacity-80">
        {subtitle}
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-gold/40 bg-cream px-4 py-3 text-navy outline-none transition-colors placeholder:text-ink-soft/60 focus:border-navy"
      />
    </label>
  );
}
