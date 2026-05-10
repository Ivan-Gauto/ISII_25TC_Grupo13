export interface Pago {
  id: number;
  contratoId: number;
  cuotaId: number;
  inquilino: string;
  inmueble: string;
  nroCuota: number;
  periodo: string;
  fechaVencimiento: string;
  fechaPago?: string;
  monto: number;
  mora: number;
  diasAtraso: number;
  totalPagado: number;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Anulado';
  estadoTexto: string;
}

export interface CuotaParaPago {
  cuotaId: string;
  nroCuota: number;
  periodo: string;
  fechaVencimiento: string;
  importeBase: number;
  tasaMoraMensual: number;
  diasAtraso: number;
  moraCalculada: number;
  totalAPagar: number;
  estado: number;
  estadoTexto: string;
}

export interface CuotaPendiente {
  idCuota: string;
  nroCuota: number;
  periodo: string;
  fechaVencimiento: string;
  estado: string;
  importeBase: number;
  valorIndiceAplicado: number;
  moraCalculada: number;
  diasAtraso: number;
  importeActualizado: number;
  otrosAdicionales: number;
  totalFinal: number;
}

export interface RegistrarPagoRequest {
  idCuota: string;
  idMetodoPago: string;
  otrosAdicionales: number;
  descuentos: number;
}

export interface RegistrarPagoInternal {
  contratoId: number;
  cuotaId: number;
  nroCuota: number;
  montoTotal: number;
  fechaPago: string;
  metodoPagoId: number;
  moraCobrada: number;
  otrosAdicionales: number;
  descAdicionales: string;
}
