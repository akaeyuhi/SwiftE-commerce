export const handlebarsHelpers = {
  currency(amount: number, currencyCode?: string) {
    const currency = currencyCode || 'USD';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(Number(amount) || 0);
    } catch {
      return `${currency} ${amount}`;
    }
  },

  formatDate(date: string | Date, format?: string) {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const dateFormat = format || 'short';
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: dateFormat as any,
      }).format(dateObj);
    } catch {
      return String(date);
    }
  },

  ifEquals(arg1: any, arg2: any, options: any) {
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
  },

  add(a: number, b: number) {
    return (Number(a) || 0) + (Number(b) || 0);
  },

  multiply(a: number, b: number) {
    return (Number(a) || 0) * (Number(b) || 0);
  },

  capitalize(str: string) {
    const text = String(str || '');
    return text.charAt(0).toUpperCase() + text.slice(1);
  },

  truncate(str: string, length: number) {
    const text = String(str || '');
    const maxLength = Number(length) || 100;
    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
  },

  toLowerCase(str: string) {
    return String(str || '').toLowerCase();
  },

  toUpperCase(str: string) {
    return String(str || '').toUpperCase();
  },

  ifExists(value: any, options: any) {
    return value ? options.fn(this) : options.inverse(this);
  },

  eachWithIndex(array: any[], options: any) {
    let result = '';
    if (array && array.length > 0) {
      for (let i = 0; i < array.length; i++) {
        result += options.fn({
          ...array[i],
          index: i,
          first: i === 0,
          last: i === array.length - 1,
        });
      }
    }
    return result;
  },

  json(obj: any) {
    try {
      return JSON.stringify(obj);
    } catch {
      return '{}';
    }
  },

  formatNumber(num: number, decimals = 2) {
    return Number(num || 0).toFixed(Number(decimals) || 2);
  },

  percentage(value: number, total: number) {
    const val = Number(value) || 0;
    const tot = Number(total) || 1;
    return ((val / tot) * 100).toFixed(1) + '%';
  },

  url(path: string, baseUrl?: string) {
    const base = baseUrl || process.env.EMAIL_BASE_URL || 'https://example.com';
    const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  },

  timeAgo(date: string | Date) {
    try {
      const now = new Date();
      const past = new Date(date);
      const diffInMs = now.getTime() - past.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
      return `${Math.floor(diffInDays / 30)} months ago`;
    } catch {
      return String(date);
    }
  },

  unless(conditional: any, options: any) {
    return !conditional ? options.fn(this) : options.inverse(this);
  },

  join(array: any[], separator: string = ', ') {
    if (!Array.isArray(array)) return '';
    return array.join(separator);
  },
} as any;
