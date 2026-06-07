export interface Pago {
  id: string;
  contratoId: string;
  cuotaId: string;
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
  estado: 'Activo' | 'Anulado';
  estadoTexto: string;
}

export interface TipoAdicional {
  id: string;
  descripcion: string;
  montoBase: number;
}

export interface CuotaAdicionalItem {
  idCuotaAdicional?: string;
  idCuota: string;
  idTipoAdicionales: string;
  montoAplicado: number;
  descripcionManual?: string;
}

export interface CuotaPendiente {
  idCuota: string;
  nroCuota: number;
  periodo: string;
  precioCuota: number;
  fechaVencimiento: string;
  valorIndiceAplicado: number;
  importeActualizado: number;
  diasAtraso: number;
  moraCalculada: number;
  totalFinal: number;
  estado: string;
}

export interface RegistrarPagoRequest {
  idCuota: string;
  idMetodoPago: string;
  monto: number;
  periodo: string;
}

export interface CuotaAdicionalDetalle {
  tipoAdicional: string;
  monto: number;
  descripcion: string | null;
}

export interface CuotaCalculada {
  idCuota: string;
  nroCuota: number;
  periodo: string;
  fechaVencimiento: string;
  precioCuota: number;
  valorIndiceAplicado: number;
  importeActualizado: number;
  totalAdicionales: number;
  detalleAdicionales: CuotaAdicionalDetalle[];
  totalDescuentos: number;
  diasAtraso: number;
  moraCalculada: number;
  totalFinal: number;
  estado: string;
}

export interface MetodoPago {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface DetallePagoResponse {
  cuota: CuotaCalculada;
  metodosPago: MetodoPago[];
}
