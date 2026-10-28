import type { SeverityLevel } from '@seo-partner/core';

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface CardProps {
  readonly id?: string;
  readonly title?: string;
  readonly ariaLabel?: string;
  readonly childrenHtml: string;
}

export function renderCard(props: CardProps): string {
  const idAttr = props.id ? ` id="${escapeHtml(props.id)}"` : '';
  const ariaAttr = props.ariaLabel ? ` aria-label="${escapeHtml(props.ariaLabel)}"` : '';
  const headingHtml = props.title
    ? `<h2 class="ui-card-title">${escapeHtml(props.title)}</h2>`
    : '';
  return `<section${idAttr}${ariaAttr} class="ui-card">
    ${headingHtml}
    <div class="ui-card-body">${props.childrenHtml}</div>
  </section>`;
}

export interface BadgeProps {
  readonly label: string;
  readonly variant: SeverityLevel | 'blocker' | 'neutral';
}

export function renderBadge(props: BadgeProps): string {
  const variantClasses: Record<BadgeProps['variant'], string> = {
    critical: 'ui-badge-critical',
    high: 'ui-badge-high',
    medium: 'ui-badge-medium',
    low: 'ui-badge-low',
    blocker: 'ui-badge-blocker',
    neutral: 'ui-badge-neutral',
  };
  return `<span class="ui-badge ${variantClasses[props.variant]}">${escapeHtml(props.label)}</span>`;
}

export interface ButtonProps {
  readonly id: string;
  readonly label: string;
  readonly type?: 'button' | 'submit';
  readonly variant?: 'primary' | 'secondary';
  readonly ariaLabel?: string;
}

export function renderButton(props: ButtonProps): string {
  const btnType = props.type ?? 'button';
  const ariaAttr = props.ariaLabel ? ` aria-label="${escapeHtml(props.ariaLabel)}"` : '';
  const variantClass =
    props.variant === 'secondary' ? 'ui-btn-secondary' : 'ui-btn-primary';
  return `<button id="${escapeHtml(props.id)}" type="${btnType}"${ariaAttr} class="ui-btn ${variantClass}">${escapeHtml(props.label)}</button>`;
}

export interface DataTableProps {
  readonly id?: string;
  readonly caption: string;
  readonly headers: ReadonlyArray<string>;
  readonly rowsHtml: ReadonlyArray<string>;
  readonly emptyMessage: string;
}

export function renderDataTable(props: DataTableProps): string {
  const idAttr = props.id ? ` id="${escapeHtml(props.id)}"` : '';
  const ths = props.headers
    .map((h) => `<th scope="col">${escapeHtml(h)}</th>`)
    .join('');

  const bodyContent =
    props.rowsHtml.length === 0
      ? `<tr><td colspan="${props.headers.length}" class="ui-table-empty">${escapeHtml(props.emptyMessage)}</td></tr>`
      : props.rowsHtml.join('\n');

  return `<div class="ui-table-wrap">
    <table${idAttr} class="ui-table">
      <caption class="sr-only">${escapeHtml(props.caption)}</caption>
      <thead><tr>${ths}</tr></thead>
      <tbody>${bodyContent}</tbody>
    </table>
  </div>`;
}

export interface SearchInputProps {
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly value?: string;
}

export function renderSearchInput(props: SearchInputProps): string {
  return `<div class="ui-field ui-field-grow">
    <label for="${escapeHtml(props.id)}" class="ui-label">${escapeHtml(props.label)}</label>
    <input id="${escapeHtml(props.id)}" type="search" value="${escapeHtml(props.value ?? '')}" placeholder="${escapeHtml(props.placeholder)}" class="ui-input" />
  </div>`;
}

export interface SelectFilterOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectFilterProps {
  readonly id: string;
  readonly label: string;
  readonly options: ReadonlyArray<SelectFilterOption>;
  readonly selectedValue?: string;
}

export function renderSelectFilter(props: SelectFilterProps): string {
  const optionsHtml = props.options
    .map((opt) => {
      const sel = opt.value === (props.selectedValue ?? '') ? ' selected' : '';
      return `<option value="${escapeHtml(opt.value)}"${sel}>${escapeHtml(opt.label)}</option>`;
    })
    .join('');
  return `<div class="ui-field">
    <label for="${escapeHtml(props.id)}" class="ui-label">${escapeHtml(props.label)}</label>
    <select id="${escapeHtml(props.id)}" class="ui-select">${optionsHtml}</select>
  </div>`;
}

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly panelId: string;
  readonly active?: boolean;
}

export function renderTabs(navLabel: string, tabs: ReadonlyArray<TabItem>): string {
  const buttons = tabs
    .map((tab) => {
      const isSelected = Boolean(tab.active);
      return `<button role="tab" id="${escapeHtml(tab.id)}" aria-selected="${isSelected ? 'true' : 'false'}" aria-controls="${escapeHtml(tab.panelId)}" data-target-panel="${escapeHtml(tab.panelId)}" type="button" class="ui-tab-btn">${escapeHtml(tab.label)}</button>`;
    })
    .join('\n');

  return `<nav aria-label="${escapeHtml(navLabel)}" class="ui-tabs-nav">
    <div role="tablist" class="ui-tablist">${buttons}</div>
  </nav>`;
}

export function renderAlertBanner(props: {
  readonly id: string;
  readonly message: string;
  readonly variant: 'info' | 'error' | 'success';
}): string {
  const variantClass = {
    info: 'ui-alert-info',
    success: 'ui-alert-success',
    error: 'ui-alert-error',
  }[props.variant];
  return `<div id="${escapeHtml(props.id)}" role="status" aria-live="polite" class="ui-alert ${variantClass}">${escapeHtml(props.message)}</div>`;
}
