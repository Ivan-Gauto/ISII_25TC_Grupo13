import api, { type ApiResponse } from './index';
import type { Inmueble } from '../types/inmueble';


export const inmueblesApi = {
  listarInmuebles: async (): Promise<Inmueble[]> => {
    const response = await api.get<ApiResponse<Inmueble[]>>('/inmueble');
    return response.data.data || [];
  },

  registrar: async (inmueble: any) => {
    return await api.post('/inmueble', inmueble);
  },

  actualizar: async (inmueble: any) => {
    return await api.put('/inmueble', inmueble);
  },

  eliminar: async (id: string) => {
    return await api.delete(`/inmueble/${id}`);
  },

  listarDisponibles: async (): Promise<Inmueble[]> => {
    const response = await api.get<ApiResponse<Inmueble[]>>('/inmueble?disponibles=true');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al obtener inmuebles disponibles');
  }
};

export default api;