import api, { type ApiResponse } from './index';
import type { Pago, CuotaPendiente, RegistrarPagoRequest, DetallePagoResponse } from '../types/pago';

export const pagosApi = {
  listar: async (estado?: number): Promise<Pago[]> => {
    const url = estado !== undefined ? `/Pago?estado=${estado}` : '/Pago';
    const response = await api.get<ApiResponse<Pago[]>>(url);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al obtener los pagos');
  },

  obtenerCuotaPendiente: async (contratoId: string): Promise<CuotaPendiente> => {
    const response = await api.get<ApiResponse<CuotaPendiente>>(`/cuota/por-contrato/${contratoId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al obtener la cuota pendiente');
  },

  calcular: async (idContrato: string): Promise<DetallePagoResponse> => {
    const response = await api.get<ApiResponse<DetallePagoResponse>>(`/Pago/calcular/${idContrato}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al calcular detalle del pago');
  },

  registrar: async (pagoData: RegistrarPagoRequest): Promise<{ pagoId: string }> => {
    const response = await api.post<ApiResponse<{ pagoId: string }>>('/Pago', pagoData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al registrar el pago');
  },

  confirmar: async (pagoId: string): Promise<void> => {
    const response = await api.patch<ApiResponse<void>>(`/Pago/${pagoId}/confirmar`);
    if (!response.data.success) {
      throw new Error(response.data.mensaje || 'Error al confirmar el pago');
    }
  },

  rechazar: async (pagoId: string): Promise<void> => {
    const response = await api.patch<ApiResponse<void>>(`/Pago/${pagoId}/rechazar`);
    if (!response.data.success) {
      throw new Error(response.data.mensaje || 'Error al rechazar el pago');
    }
  },

  rechazarConMotivo: async (pagoId: string, motivo: string): Promise<void> => {
    const response = await api.patch<ApiResponse<void>>(`/Pago/${pagoId}/rechazar`, { motivo });
    if (!response.data.success) {
      throw new Error(response.data.mensaje || 'Error al rechazar el pago');
    }
  },

  anular: async (pagoId: string, motivo: string): Promise<void> => {
    const response = await api.post<ApiResponse<void>>(`/Pago/${pagoId}/anular`, { motivo });
    if (!response.data.success) {
      throw new Error(response.data.mensaje || 'Error al anular el pago');
    }
  }
};
