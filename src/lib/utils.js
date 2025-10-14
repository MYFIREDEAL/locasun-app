import { clsx } from "clsx"
    import { twMerge } from "tailwind-merge"

    export function cn(...inputs) {
      return twMerge(clsx(inputs))
    }

    export function slugify(text) {
      if (!text) return '';
      return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    }