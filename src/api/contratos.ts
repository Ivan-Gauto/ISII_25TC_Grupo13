import api, { type ApiResponse } from './index';
import type { Contrato, CrearContratoRequest } from '../types/contrato';

export const contratosApi = {
  listar: async (estado?: number): Promise<Contrato[]> => {
    const url = estado !== undefined ? `/contrato?estado=${estado}` : `/contrato`;
    const response = await api.get<ApiResponse<Contrato[]>>(url);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al obtener contratos');
  },

  listarActivosPorInquilino: async (inquilinoId: string): Promise<Contrato[]> => {
    const response = await api.get<ApiResponse<Contrato[]>>(
      `/contrato/activos-por-inquilino`,
      {
        params: { idInquilino: inquilinoId }
      }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.mensaje || 'Error al obtener contratos');
  },

  obtenerPorId: async (id: string): Promise<Contrato> => {
    const response = await api.get<ApiResponse<Contrato>>(`/contrato/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al obtener contrato');
  },

  crear: async (contrato: CrearContratoRequest): Promise<string> => {
    const response = await api.post<ApiResponse<{ contratoId: string }>>('/contrato', contrato);
    if (response.data.success && response.data.data) {
      return response.data.data.contratoId;
    }
    throw new Error(response.data.mensaje || 'Error al crear contrato');
  },

  rescindir: async (id: string): Promise<void> => {
    const response = await api.put<ApiResponse<void>>(`/contrato/rescindir/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.mensaje || 'Error al rescindir contrato');
    }
  },
};

export default api;