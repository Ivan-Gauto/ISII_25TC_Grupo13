import { DIAS_AVISO_VENCIMIENTO } from './constants';

/**
 * Formatea una fecha ISO a formato local (DD/MM/YYYY) o similar
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
  } catch {
    return 'Fecha inválida';
  }
};

/**
 * Formatea un string de fecha para inputs tipo date (YYYY-MM-DD)
 */
export const toInputDate = (date: Date = new Date()): string => {
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

/**
 * Formatea un número a moneda argentina
 */
export const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined) return '$ 0,00';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
};

/**
 * Verifica si una fecha está dentro de los próximos 30 días
 */
export const isPorVencer = (fechaFin: string | undefined): boolean => {
  if (!fechaFin) return false;
  const final = new Date(fechaFin);
  const hoy = new Date();
  const diffTime = final.getTime() - hoy.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= DIAS_AVISO_VENCIMIENTO;
};
