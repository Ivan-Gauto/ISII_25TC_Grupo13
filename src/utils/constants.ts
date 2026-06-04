/**
 * Constantes globales para la aplicación InmoGestor.
 * Centraliza estados, roles y configuraciones para evitar datos hardcodeados.
 */

export const ROLES = {
  SUPERIOR: 'Superior',
  OPERADOR: 'Operador'
};

export const ESTADOS_CONTRATO = {
  ACTIVO: 1,
  RESCINDIDO: 0
};

export const ESTADOS_PAGO = {
  ANULADO: 0,
  CONFIRMADO: 1,
  SOLICITUD: 2
};

export const FRECUENCIAS_AJUSTE = [
  'Cuatrimestral',
  'Semestral',
  'Anual'
];

export const FRECUENCIAS_PAGO = [
  'Mensual'
];

export const MAX_CANTIDAD_CUOTAS = 120;

export const DIAS_AVISO_VENCIMIENTO = 30;
