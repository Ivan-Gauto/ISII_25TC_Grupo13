import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Container, Card, CardContent, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, IconButton, Tooltip, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar,
  MenuItem, Select, Badge
} from '@mui/material';
import {
  ReceiptOutlined as ReceiptIcon,
  CancelOutlined as CancelIcon,
  PaymentOutlined as PaymentIcon,
  CloseOutlined as CloseIcon,
  PersonOutlined as PersonIcon,
  HomeWorkOutlined as HomeWorkIcon,
  EditOutlined as EditIcon,
  CalendarTodayOutlined as CalendarIcon,
  AttachMoneyOutlined as MoneyIcon,
  NotificationsOutlined as NotificationsIcon,
  DeleteOutlined as DeleteIcon,
} from '@mui/icons-material';
import { pagosApi } from '../api/pagos';
import { contratosApi } from '../api/contratos';
import { inquilinosApi } from '../api/inquilinos';
import { adicionalesApi } from '../api/adicionales';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { SearchInput } from '../components/common/SearchInput';
import { StatusChip } from '../components/common/StatusChip';
import { formatCurrency, formatDate } from '../utils/formatters';

import type { Pago, CuotaPendiente, RegistrarPagoRequest, DetallePagoResponse, TipoAdicional } from '../types/pago';
import type { Contrato } from '../types/contrato';
import type { Inquilino } from '../types/inquilino';

// Tipos para notificaciones
interface Notificacion {
  id: string;
  tipo: 'rechazo' | 'aprobacion' | 'info';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  pagoId?: string;
}

const initialFormData: RegistrarPagoRequest = {
  idCuota: '',
  idMetodoPago: '',
  monto: 0,
  periodo: ''
};

export default function PagosPage() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering state
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog state for confirming void
  const [anularDialog, setAnularDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [dialogLoading, setDialogLoading] = useState(false);

  // Dialog state for confirm/reject
  const [actionDialog, setActionDialog] = useState<{ open: boolean; id: string | null; action: 'confirmar' | 'rechazar' | null }>({ open: false, id: null, action: null });

  // NEW: Estado para motivo de rechazo
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  // Dialog state for registering payment
  const [registrarDialog, setRegistrarDialog] = useState(false);
  const [registrarLoading, setRegistrarLoading] = useState(false);
  const [formData, setFormData] = useState<RegistrarPagoRequest>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    inquilino?: string;
    contrato?: string;
    metodoPago?: string;
    descuento?: string;
  }>({});
  const [selectedInquilinoId, setSelectedInquilinoId] = useState<string>('');
  const [contratosInquilino, setContratosInquilino] = useState<Contrato[]>([]);
  const [selectedContratoId, setSelectedContratoId] = useState('');
  const [cuotaPendiente, setCuotaPendiente] = useState<CuotaPendiente | null>(null);
  const [detallePago, setDetallePago] = useState<DetallePagoResponse | null>(null);

  // Adicionales / Descuentos state
  const [tiposAdicionales, setTiposAdicionales] = useState<TipoAdicional[]>([]);
  const [selectedTipoAdicionalId, setSelectedTipoAdicionalId] = useState('');
  const [adicionalMontoStr, setAdicionalMontoStr] = useState('');
  const [adicionalDescripcion, setAdicionalDescripcion] = useState('');
  const [showAdicionalForm, setShowAdicionalForm] = useState(false);
  const [descuentoInput, setDescuentoInput] = useState(0);
  const [actualizandoCalculo, setActualizandoCalculo] = useState(false);

  // Session-local adicionales (not persisted until registration)
  const [sessionAdicionales, setSessionAdicionales] = useState<Array<{ idTipoAdicionales: string; montoAplicado: number; descripcionManual?: string }>>([]);
  const sessionTotalAdicionales = useMemo(() => sessionAdicionales.reduce((sum, a) => sum + a.montoAplicado, 0), [sessionAdicionales]);

  // Success snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '' });

  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);

  // NEW: Sistema de notificaciones
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionesOpen, setNotificacionesOpen] = useState(false);

  const { isOperador, canAnular, user } = useAuth();

  // Cargar notificaciones del localStorage al iniciar
  useEffect(() => {
    const savedNotificaciones = localStorage.getItem(`notificaciones_${user?.usuarioId}`);
    if (savedNotificaciones) {
      const parsed = JSON.parse(savedNotificaciones);
      setNotificaciones(parsed.map((n: Notificacion) => ({ ...n, fecha: new Date(n.fecha) })));
    }
  }, [user?.usuarioId]);

  // Guardar notificaciones en localStorage cuando cambien
  useEffect(() => {
    if (user?.usuarioId && notificaciones.length > 0) {
      localStorage.setItem(`notificaciones_${user.usuarioId}`, JSON.stringify(notificaciones));
    }
  }, [notificaciones, user?.usuarioId]);

  const notificacionesNoLeidas = useMemo(() => notificaciones.filter(n => !n.leida).length, [notificaciones]);

  const agregarNotificacion = (notif: Omit<Notificacion, 'id' | 'fecha' | 'leida'>) => {
    const nueva: Notificacion = {
      ...notif,
      id: Date.now().toString(),
      fecha: new Date(),
      leida: false
    };
    setNotificaciones(prev => [nueva, ...prev]);
  };

  const marcarComoLeida = (id: string) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const eliminarNotificacion = (id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  const marcarTodasComoLeidas = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const fetchPagos = async () => {
    try {
      setLoading(true);
      setError(null);
      const dataPagos = await pagosApi.listar();
      setPagos(dataPagos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  const openRegistrarDialog = async () => {
    try {
      setLoading(true);
      const dataInquilinos = await inquilinosApi.listarConContratos();
      setInquilinos(dataInquilinos);
      setContratosInquilino([]);
      setCuotaPendiente(null);
      setDetallePago(null);
      setSelectedInquilinoId('');
      setSelectedContratoId('');
      setFormData(initialFormData);
      setRegistrarDialog(true);

    } catch (err) {
      console.error('Error al cargar datos:', err);
      alert('Error al cargar datos. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPagos();
  }, []);

  const handleAnular = async () => {
    if (!anularDialog.id) return;
    if (!motivoAnulacion.trim()) {
      setSnackbar({ open: true, message: 'Debe ingresar un motivo de anulación', severity: 'warning' });
      return;
    }
    try {
      setDialogLoading(true);
      await pagosApi.anular(anularDialog.id, motivoAnulacion);
      setAnularDialog({ open: false, id: null });
      setMotivoAnulacion('');
      fetchPagos();
      setSnackbar({ open: true, message: 'Pago anulado exitosamente', severity: 'success' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al anular pago');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleConfirmar = async () => {
    if (!actionDialog.id) return;
    try {
      setDialogLoading(true);
      await pagosApi.confirmar(actionDialog.id);
      setActionDialog({ open: false, id: null, action: null });
      fetchPagos();
      setSnackbar({ open: true, message: 'Pago confirmado exitosamente', severity: 'success' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al confirmar el pago');
    } finally {
      setDialogLoading(false);
    }
  };

  // UPDATED: Rechazar con motivo
  const handleRechazar = async () => {
    if (!actionDialog.id) return;
    if (!motivoRechazo.trim()) {
      setSnackbar({ open: true, message: 'Debe ingresar un motivo de rechazo', severity: 'warning' });
      return;
    }
    try {
      setDialogLoading(true);
      // Llamar al endpoint con motivo
      await pagosApi.rechazarConMotivo(actionDialog.id, motivoRechazo);

      // Obtener datos del pago para la notificacion
      const pagoRechazado = pagos.find(p => p.id === actionDialog.id);

      // Crear notificacion para el operador que registro el pago
      if (pagoRechazado) {
        agregarNotificacion({
          tipo: 'rechazo',
          titulo: 'Solicitud de pago rechazada',
          mensaje: `El pago de ${pagoRechazado.inquilino} para ${pagoRechazado.inmueble} (Cuota ${pagoRechazado.nroCuota}) fue rechazado. Motivo: ${motivoRechazo}`,
          pagoId: actionDialog.id
        });
      }

      setActionDialog({ open: false, id: null, action: null });
      setMotivoRechazo('');
      fetchPagos();
      setSnackbar({ open: true, message: 'Pago rechazado correctamente', severity: 'info' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al rechazar el pago');
    } finally {
      setDialogLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!selectedInquilinoId) errors.inquilino = 'Debe seleccionar un inquilino';
    if (!selectedContratoId) errors.contrato = 'Debe seleccionar un contrato';
    if (!formData.idMetodoPago) errors.metodoPago = 'Debe seleccionar un método de pago';

    const totalAntesDescuento =
      (detallePago?.cuota.importeActualizado ?? cuotaPendiente?.precioCuota ?? 0) +
      (detallePago?.cuota.moraCalculada ?? cuotaPendiente?.moraCalculada ?? 0) +
      (detallePago?.cuota.totalAdicionales ?? 0) +
      sessionTotalAdicionales;

    if (descuentoInput > totalAntesDescuento) {
      errors.descuento = 'El descuento no puede superar el monto total';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegistrarPago = async () => {
    setFormError(null);
    setFieldErrors({});

    if (!validateForm()) return;

    if (!formData.idCuota) {
      setFormError('No se ha cargado una cuota pendiente');
      return;
    }
    if (formData.monto <= 0) {
      setFormError('El monto debe ser mayor a 0');
      return;
    }

    try {
      setRegistrarLoading(true);

      // Persist session adicionales first, then recalculate to get correct total
      for (const adicional of sessionAdicionales) {
        await adicionalesApi.crear(formData.idCuota, adicional.idTipoAdicionales, adicional.montoAplicado, adicional.descripcionManual);
      }

      const calculado = await pagosApi.calcular(selectedContratoId);
      const montoFinal = calculado.cuota.totalFinal;

      await pagosApi.registrar({ ...formData, monto: montoFinal });
      setRegistrarDialog(false);
      setFormData(initialFormData);
      setSessionAdicionales([]);
      fetchPagos();
      setSnackbar({
        open: true,
        message: isOperador
          ? 'Solicitud de pago enviada para aprobacion'
          : 'Pago registrado y confirmado exitosamente',
        severity: 'success'
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al registrar el pago');
    } finally {
      setRegistrarLoading(false);
    }
  };

  const filteredPagos = useMemo(() => {
    let result = pagos;

    // Filter by Tab (Pago estado)
    if (tabValue === 1) result = result.filter(p => p.estado === 'Activo');
    else if (tabValue === 2) result = result.filter(p => p.estado === 'Anulado');

    // Filter by Search Term
    if (searchTerm) {
      const lowerSrc = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.inquilino.toLowerCase().includes(lowerSrc) ||
        p.inmueble.toLowerCase().includes(lowerSrc) ||
        p.contratoId.toString().includes(lowerSrc)
      );
    }

    return result;
  }, [pagos, tabValue, searchTerm]);

  const contratoActivo = useMemo(() => contratosInquilino.find(c => c.id === selectedContratoId), [contratosInquilino, selectedContratoId]);
  const importeBase = detallePago?.cuota.precioCuota ?? cuotaPendiente?.precioCuota ?? 0;
  const importeActualizado = detallePago?.cuota.importeActualizado ?? 0;
  const moraCalculada = detallePago?.cuota.moraCalculada ?? cuotaPendiente?.moraCalculada ?? 0;
  const totalAdicionalesServidor = detallePago?.cuota.totalAdicionales ?? 0;
  const totalFinal = detallePago?.cuota.totalFinal ?? cuotaPendiente?.totalFinal ?? 0;
  const totalDescuentos = detallePago?.cuota.totalDescuentos ?? 0;
  const periodoCuota = detallePago?.cuota.periodo ?? cuotaPendiente?.periodo ?? '';
  const fechaVencimiento = detallePago?.cuota.fechaVencimiento ?? cuotaPendiente?.fechaVencimiento ?? '';
  const dynamicTotal = Math.max(0, importeActualizado + moraCalculada + totalAdicionalesServidor + sessionTotalAdicionales - descuentoInput);
  const descuentoDiferente = descuentoInput !== totalDescuentos;

  const recalcularCuota = async () => {
    if (!selectedContratoId) return;
    try {
      setActualizandoCalculo(true);
      const calculado = await pagosApi.calcular(selectedContratoId);
      setDetallePago(calculado);
      setDescuentoInput(calculado.cuota.totalDescuentos);
      setFormData(prev => ({
        ...prev,
        monto: calculado.cuota.totalFinal
      }));
    } catch (err) {
      console.error('Error al recalcular:', err);
    } finally {
      setActualizandoCalculo(false);
    }
  };

  const handleAgregarAdicional = () => {
    const monto = Number(adicionalMontoStr);
    if (!formData.idCuota || !selectedTipoAdicionalId || !adicionalMontoStr || monto <= 0) {
      if (!selectedTipoAdicionalId || !adicionalMontoStr || monto <= 0) {
        setSnackbar({ open: true, message: 'Complete el tipo y monto del adicional antes de agregarlo', severity: 'warning' });
      }
      return;
    }
    const tipoId = selectedTipoAdicionalId;
    const descripcion = adicionalDescripcion;

    setSessionAdicionales(prev => [...prev, { idTipoAdicionales: tipoId, montoAplicado: monto, descripcionManual: descripcion || undefined }]);
    setFormData(prev => ({ ...prev, monto: Math.max(0, (prev.monto ?? 0) + monto) }));

    setShowAdicionalForm(false);
    setSelectedTipoAdicionalId('');
    setAdicionalMontoStr('');
    setAdicionalDescripcion('');
  };

  const handleAplicarDescuento = async () => {
    if (!formData.idCuota) return;
    try {
      setActualizandoCalculo(true);
      await adicionalesApi.actualizarDescuento(formData.idCuota, descuentoInput);
      await recalcularCuota();
      setSnackbar({ open: true, message: 'Descuento aplicado correctamente', severity: 'success' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al aplicar descuento');
    } finally {
      setActualizandoCalculo(false);
    }
  };

  const resetDialogForm = () => {
    setRegistrarDialog(false);
    setFormData(initialFormData);
    setSelectedInquilinoId('');
    setSelectedContratoId('');
    setContratosInquilino([]);
    setCuotaPendiente(null);
    setDetallePago(null);
    setFormError(null);
    setFieldErrors({});
    setTiposAdicionales([]);
    setShowAdicionalForm(false);
    setSelectedTipoAdicionalId('');
    setAdicionalMontoStr('');
    setAdicionalDescripcion('');
    setDescuentoInput(0);
    setSessionAdicionales([]);
  };

  const resetActionDialog = () => {
    setActionDialog({ open: false, id: null, action: null });
    setMotivoRechazo('');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <PageHeader
          title="Gestion de Pagos"
          subtitle="Administra cobros, emite recibos y controla vencimientos."
        />

        {/* Acciones del header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <Button
            variant="contained"
            startIcon={<PaymentIcon />}
            onClick={openRegistrarDialog}
            sx={{
              borderRadius: '6px',
              px: 3,
              py: 1,
              bgcolor: '#fff',
              color: '#000',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#f0f0f0' }
            }}
          >
            Registrar Pago
          </Button>

        {/* Boton de notificaciones */}
        <Box sx={{ position: 'relative' }}>
          <Tooltip title="Notificaciones">
            <IconButton
              onClick={() => setNotificacionesOpen(!notificacionesOpen)}
              sx={{
                bgcolor: notificacionesNoLeidas > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                '&:hover': { bgcolor: notificacionesNoLeidas > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)' }
              }}
            >
              <Badge badgeContent={notificacionesNoLeidas} color="error">
                <NotificationsIcon sx={{ color: notificacionesNoLeidas > 0 ? '#ef4444' : 'text.secondary' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Panel de notificaciones */}
          {notificacionesOpen && (
            <Card sx={{
              position: 'absolute',
              top: '100%',
              right: 0,
              mt: 1,
              width: 380,
              maxHeight: 450,
              overflow: 'hidden',
              zIndex: 1000,
              border: '1px solid rgba(255,255,255,0.1)',
              bgcolor: '#0A0A0A',
              borderRadius: 2,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notificaciones</Typography>
                {notificaciones.length > 0 && (
                  <Button size="small" onClick={marcarTodasComoLeidas} sx={{ fontSize: '0.75rem' }}>
                    Marcar todas como leidas
                  </Button>
                )}
              </Box>
              <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
                {notificaciones.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <NotificationsIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No hay notificaciones</Typography>
                  </Box>
                ) : (
                  notificaciones.map(notif => (
                    <Box
                      key={notif.id}
                      onClick={() => marcarComoLeida(notif.id)}
                      sx={{
                        p: 2,
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        bgcolor: notif.leida ? 'transparent' : 'rgba(239, 68, 68, 0.05)',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                        display: 'flex',
                        gap: 2
                      }}
                    >
                      <Box sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: notif.tipo === 'rechazo' ? '#ef4444' : notif.tipo === 'aprobacion' ? '#10b981' : '#3b82f6',
                        mt: 0.5,
                        flexShrink: 0
                      }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{notif.titulo}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                          {notif.mensaje}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', opacity: 0.6 }}>
                          {new Date(notif.fecha).toLocaleString('es-AR')}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); eliminarNotificacion(notif.id); }}
                        sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))
                )}
              </Box>
            </Card>
          )}
        </Box>
        </Box>
      </Box>

      {/* Barra de Métricas Sobria */}
      <Box sx={{
        display: 'flex',
        gap: 6,
        mb: 6,
        pb: 4,
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>TOTAL</Typography>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 300 }}>{pagos.length}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>ACTIVOS</Typography>
          <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 300 }}>{pagos.filter(p => p.estado === 'Activo').length}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>ANULADOS</Typography>
          <Typography variant="h4" sx={{ color: 'rgba(255,255,255,0.15)', fontWeight: 300 }}>{pagos.filter(p => p.estado === 'Anulado').length}</Typography>
        </Box>
      </Box>

      <Card sx={{ mb: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', bgcolor: '#0A0A0A', boxShadow: 'none', borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <SearchInput
              placeholder="Buscar por inquilino, inmueble..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
            <Select
              size="small"
              value={tabValue}
              onChange={(e) => setTabValue(e.target.value as number)}
              sx={{ minWidth: 150, borderRadius: 2, bgcolor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', '& fieldset': { border: 'none' } }}
            >
              <MenuItem value={0}>Todos</MenuItem>
              <MenuItem value={1}>Activos</MenuItem>
              <MenuItem value={2}>Anulados</MenuItem>
            </Select>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : (
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>Inmueble</TableCell>
                    <TableCell>Inquilino</TableCell>
                    <TableCell align="center">Cuota</TableCell>
                    <TableCell>Vencimiento</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="center" sx={{ pr: 4 }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPagos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 10 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
                          <PaymentIcon sx={{ fontSize: 48, mb: 1.5 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>No hay pagos</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>No se encontraron registros con estos filtros.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPagos.map((pago) => (
                      <TableRow key={pago.id} hover>
                        <TableCell sx={{ pl: 4 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{pago.inmueble || 'N/A'}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{pago.inquilino}</TableCell>
                        <TableCell align="center">
                          <Chip label={`Cuota ${pago.nroCuota}`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.primary">
                            {formatDate(pago.fechaVencimiento)}
                          </Typography>
                          {pago.fechaPago && (
                            <Typography variant="caption" color="text.secondary">
                              Pago: {formatDate(pago.fechaPago)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {formatCurrency(pago.monto)}
                          </Typography>
                          {pago.mora > 0 && (
                            <Typography variant="caption" color="error.main">
                              + {formatCurrency(pago.mora)} mora
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {pago.estado === 'Anulado' ? (
                            <StatusChip label="Anulado" type="error" variant="outlined" />
                          ) : (
                            <StatusChip label="Activo" type="success" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ pr: 4 }}>
                          {canAnular && pago.estado === 'Activo' && (
                            <Tooltip title="Anular Pago">
                              <IconButton
                                onClick={() => setAnularDialog({ open: true, id: pago.id })}
                                sx={{ color: 'rgba(244, 67, 54, 0.5)', '&:hover': { color: '#f44336', bgcolor: 'rgba(244, 67, 54, 0.1)' } }}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Anular */}
      <Dialog
        open={anularDialog.open}
        onClose={() => !dialogLoading && setAnularDialog({ open: false, id: null })}
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Anular Pago</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            ¿Estas seguro que deseas anular este pago? La cuota volverá a estar pendiente de pago.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Motivo de la anulación"
            placeholder="Ej: Pago duplicado, error en el monto..."
            value={motivoAnulacion}
            onChange={(e) => setMotivoAnulacion(e.target.value)}
            error={!motivoAnulacion.trim() && dialogLoading}
            helperText={!motivoAnulacion.trim() && dialogLoading ? "El motivo es obligatorio" : ""}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setAnularDialog({ open: false, id: null })}
            color="inherit"
            disabled={dialogLoading}
            sx={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAnular}
            color="error"
            variant="contained"
            disabled={dialogLoading}
            sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            {dialogLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirmar Anulacion'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* UPDATED: Dialog for Confirm/Reject with motivo */}
      <Dialog
        open={actionDialog.open}
        onClose={() => !dialogLoading && resetActionDialog()}
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper', p: 1, minWidth: actionDialog.action === 'rechazar' ? 450 : 'auto' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {actionDialog.action === 'confirmar' ? 'Confirmar Pago' : 'Rechazar Solicitud'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: actionDialog.action === 'rechazar' ? 2 : 0 }}>
            {actionDialog.action === 'confirmar'
              ? '¿Estas seguro que deseas confirmar este pago? Una vez confirmado, el pago quedara registrado como efectivo y se podra generar el comprobante.'
              : '¿Estas seguro que deseas rechazar esta solicitud de pago? Por favor, indica el motivo del rechazo para notificar al operador.'}
          </DialogContentText>

          {/* Campo de motivo solo para rechazo */}
          {actionDialog.action === 'rechazar' && (
            <TextField
              autoFocus
              fullWidth
              multiline
              rows={3}
              label="Motivo del rechazo"
              placeholder="Ej: Datos incorrectos, monto no coincide, documentacion faltante..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              sx={{ mt: 1 }}
              error={!motivoRechazo.trim() && dialogLoading}
              helperText={!motivoRechazo.trim() ? "El motivo es obligatorio" : ""}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={resetActionDialog}
            color="inherit"
            disabled={dialogLoading}
            sx={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={actionDialog.action === 'confirmar' ? handleConfirmar : handleRechazar}
            color={actionDialog.action === 'confirmar' ? 'success' : 'error'}
            variant="contained"
            disabled={dialogLoading || (actionDialog.action === 'rechazar' && !motivoRechazo.trim())}
            sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            {dialogLoading ? <CircularProgress size={24} color="inherit" /> : (actionDialog.action === 'confirmar' ? 'Confirmar' : 'Rechazar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Registrar Pago */}
      <Dialog
        open={registrarDialog}
        onClose={() => !registrarLoading && resetDialogForm()}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
          Registrar pago
          <IconButton onClick={() => !registrarLoading && resetDialogForm()} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 4 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formError}
            </Alert>
          )}

          {inquilinos.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              No hay inquilinos con contratos activos.
            </Alert>
          ) : null}

          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 3, mb: 3, mt: 1 }}>
            <Box>
              <Typography sx={{ mb: 1, fontWeight: 700, fontSize: '0.875rem' }}>Inquilino</Typography>
              <Select
                fullWidth
                size="small"
                error={!!fieldErrors.inquilino}
                value={selectedInquilinoId}
                onChange={async (e) => {
                  setFieldErrors(prev => ({ ...prev, inquilino: undefined, contrato: undefined }));
                  const id = e.target.value as string;
                  setSelectedInquilinoId(id);
                  setSelectedContratoId('');
                  setCuotaPendiente(null);
                  setDetallePago(null);
                  setFormData(prev => ({ ...prev, idCuota: '', idMetodoPago: '', monto: 0, periodo: '' }));

                  if (!id) {
                    setContratosInquilino([]);
                    return;
                  }

                  try {
                    const data = await contratosApi.listarActivosPorInquilino(id);
                    setContratosInquilino(data);
                  } catch (err) {
                    console.error('Error al cargar contratos:', err);
                    setContratosInquilino([]);
                  }
                }}
              >
                {inquilinos.map(inq => (
                  <MenuItem key={inq.id} value={inq.id}>
                    {inq.nombreCompleto}
                  </MenuItem>
                ))}
              </Select>
              {fieldErrors.inquilino && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {fieldErrors.inquilino}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography sx={{ mb: 1, fontWeight: 700, fontSize: '0.875rem' }}>Contrato</Typography>
              <Select
                fullWidth
                size="small"
                disabled={!selectedInquilinoId}
                error={!!fieldErrors.contrato}
                value={selectedContratoId}
                onChange={async (e) => {
                  setFieldErrors(prev => ({ ...prev, contrato: undefined }));
                  const cId = e.target.value as string;
                  setSelectedContratoId(cId);

                  if (!cId) {
                    setCuotaPendiente(null);
                    setDetallePago(null);
                    setFormData(prev => ({ ...prev, idCuota: '', idMetodoPago: '', monto: 0, periodo: '' }));
                    return;
                  }

                  try {
                    const [pendiente, calculado, tipos] = await Promise.all([
                      pagosApi.obtenerCuotaPendiente(cId),
                      pagosApi.calcular(cId),
                      adicionalesApi.listarTipos()
                    ]);
                    setCuotaPendiente(pendiente);
                    setDetallePago(calculado);
                    setTiposAdicionales(tipos);
                    setDescuentoInput(calculado.cuota.totalDescuentos);
                    setShowAdicionalForm(false);
                    setSessionAdicionales([]);
                    setSelectedTipoAdicionalId('');
                    setAdicionalMontoStr('');
                    setAdicionalDescripcion('');
                    setFormData(prev => ({
                      ...prev,
                      idCuota: pendiente.idCuota,
                      monto: pendiente.totalFinal,
                      periodo: pendiente.periodo
                    }));
                  } catch (err) {
                    console.error('Error al cargar datos de la cuota:', err);
                    setCuotaPendiente(null);
                    setDetallePago(null);
                  }
                }}
              >
                {!selectedInquilinoId ? (
                  <MenuItem value="" disabled>Seleccione un inquilino primero</MenuItem>
                ) : contratosInquilino.length === 0 ? (
                  <MenuItem value="" disabled>Sin contratos activos para este inquilino</MenuItem>
                ) : (
                  contratosInquilino.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.direccion || c.inmueble}
                    </MenuItem>
                  ))
                )}
              </Select>
              {fieldErrors.contrato && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {fieldErrors.contrato}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 3, mb: 3 }}>
            <Box>
              <Typography sx={{ mb: 1, fontWeight: 700, fontSize: '0.875rem' }}>Metodo de pago</Typography>
              <Select
                fullWidth
                size="small"
                disabled={!detallePago}
                error={!!fieldErrors.metodoPago}
                value={formData.idMetodoPago}
                onChange={(e) => {
                  setFieldErrors(prev => ({ ...prev, metodoPago: undefined }));
                  setFormData(prev => ({ ...prev, idMetodoPago: e.target.value }));
                }}
              >
                {!detallePago ? (
                  <MenuItem value="" disabled>Seleccione un contrato primero</MenuItem>
                ) : detallePago.metodosPago.length === 0 ? (
                  <MenuItem value="" disabled>Sin metodos de pago disponibles</MenuItem>
                ) : (
                  detallePago.metodosPago.map(mp => (
                    <MenuItem key={mp.id} value={mp.id}>
                      {mp.nombre}
                    </MenuItem>
                  ))
                )}
              </Select>
              {fieldErrors.metodoPago && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {fieldErrors.metodoPago}
                </Typography>
              )}
            </Box>
          </Box>

          {detallePago && (
            <Box sx={{ mb: 4, p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Adicionales</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowAdicionalForm(!showAdicionalForm)}
                  disabled={actualizandoCalculo}
                >
                  {showAdicionalForm ? 'Cancelar' : 'Agregar adicional'}
                </Button>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MoneyIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">Total adicionales aplicados:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>$ {sessionTotalAdicionales.toLocaleString('es-AR')}</Typography>
                {actualizandoCalculo && <CircularProgress size={16} />}
              </Box>
              {showAdicionalForm && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Nuevo adicional</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.8rem' }}>Tipo</Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={selectedTipoAdicionalId}
                        onChange={(e) => {
                          const tipoId = e.target.value;
                          setSelectedTipoAdicionalId(tipoId);
                          const tipo = tiposAdicionales.find(t => t.id === tipoId);
                          if (tipo) setAdicionalMontoStr(tipo.montoBase.toString());
                        }}
                      >
                        {tiposAdicionales.map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.descripcion}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <Box>
                      <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.8rem' }}>Monto</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={adicionalMontoStr}
                        onChange={(e) => setAdicionalMontoStr(e.target.value)}
                      />
                    </Box>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Descripcion (opcional)"
                    value={adicionalDescripcion}
                    onChange={(e) => setAdicionalDescripcion(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleAgregarAdicional}
                    disabled={!selectedTipoAdicionalId || !adicionalMontoStr || Number(adicionalMontoStr) <= 0}
                    sx={{ alignSelf: 'flex-end' }}
                  >
                    Agregar
                  </Button>
                </Box>
              )}
            </Box>
          )}

          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.02)',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.06)',
              p: 3,
              transition: 'all 0.2s ease'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon sx={{ fontSize: 20, opacity: 0.7 }} />
                Detalle de la cuota
              </Typography>
              <Chip
                label={cuotaPendiente?.estado === 'Vencida' ? 'Vencida' : cuotaPendiente?.estado === 'Pagada' ? 'Pagada' : 'Pendiente'}
                sx={{
                  bgcolor: cuotaPendiente?.estado === 'Vencida' ? '#ff4d4f' : cuotaPendiente?.estado === 'Pagada' ? '#10B981' : '#FFFF00',
                  color: '#000',
                  fontWeight: 800,
                  borderRadius: 1,
                  height: 24
                }}
                size="small"
              />
            </Box>

            <Typography sx={{ color: 'error.main', fontWeight: 700, fontSize: '0.8rem', mb: 3, opacity: 0.8, letterSpacing: 0.3 }}>
              Verifique los datos antes de registrar — de lo contrario deberá anular y rehacer el pago
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, pb: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 70 }}>Inquilino</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{contratoActivo?.inquilino || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HomeWorkIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 70 }}>Inmueble</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{contratoActivo?.direccion || contratoActivo?.inmueble || '-'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EditIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 70 }}>Nro. cuota</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {cuotaPendiente?.nroCuota ?? detallePago?.cuota.nroCuota ?? '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 70 }}>Vencimiento</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {fechaVencimiento ? new Date(fechaVencimiento).toLocaleDateString('es-AR') : '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon sx={{ fontSize: 18, opacity: 0.5 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 70 }}>Periodo</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{periodoCuota || '-'}</Typography>
                </Box>
              </Box>

              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.03)',
                borderRadius: 1.5,
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, mb: 0.5 }}>
                  Desglose de importes
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon sx={{ fontSize: 16, opacity: 0.4 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 170, fontSize: '0.85rem' }}>Precio cuota base</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>$ {importeBase.toLocaleString('es-AR')}</Typography>
                </Box>

                {detallePago ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MoneyIcon sx={{ fontSize: 16, opacity: 0.4 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 170, fontSize: '0.85rem' }}>Valor índice aplicado</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{detallePago.cuota.valorIndiceAplicado.toLocaleString('es-AR')}</Typography>
                  </Box>
                ) : null}

                {detallePago ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MoneyIcon sx={{ fontSize: 16, opacity: 0.4 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 170, fontSize: '0.85rem' }}>Importe actualizado</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>$ {importeActualizado.toLocaleString('es-AR')}</Typography>
                  </Box>
                ) : null}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon sx={{ fontSize: 16, opacity: 0.4 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 170, fontSize: '0.85rem' }}>Adicionales</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {totalAdicionalesServidor + sessionTotalAdicionales > 0 ? `$ ${(totalAdicionalesServidor + sessionTotalAdicionales).toLocaleString('es-AR')}` : '—'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon sx={{ fontSize: 16, opacity: 0.4 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 170, fontSize: '0.85rem' }}>Adicional por mora</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {moraCalculada > 0 ? `$ ${moraCalculada.toLocaleString('es-AR')}` : '—'}
                  </Typography>
                </Box>

                {detallePago && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <MoneyIcon sx={{ fontSize: 16, opacity: 0.4 }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 170, fontSize: '0.85rem' }}>Descuento</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        size="small"
                        type="number"
                        error={!!fieldErrors.descuento}
                        helperText={fieldErrors.descuento || ''}
                        value={descuentoInput}
                        onChange={(e) => {
                          setFieldErrors(prev => ({ ...prev, descuento: undefined }));
                          const val = Math.max(0, Number(e.target.value));
                          setDescuentoInput(val);
                        }}
                        sx={{
                          width: 130,
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: fieldErrors.descuento ? '#ff4d4f' : descuentoDiferente ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.15)'
                          }
                        }}
                        disabled={actualizandoCalculo}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleAplicarDescuento}
                        disabled={actualizandoCalculo || descuentoInput < 0 || !descuentoDiferente}
                        sx={{
                          minWidth: 70,
                          height: 36,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          bgcolor: descuentoDiferente ? 'rgba(16, 185, 129, 0.2)' : undefined,
                          color: descuentoDiferente ? '#10B981' : undefined,
                          '&:hover': descuentoDiferente ? { bgcolor: 'rgba(16, 185, 129, 0.3)' } : undefined,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {actualizandoCalculo ? <CircularProgress size={14} /> : 'Aplicar'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>

              <Box sx={{
                mt: 1,
                p: 2.5,
                borderRadius: 1.5,
                bgcolor: descuentoDiferente
                  ? 'rgba(16, 185, 129, 0.06)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${
                  descuentoDiferente
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(255,255,255,0.06)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <MoneyIcon sx={{ fontSize: 22, opacity: 0.7 }} />
                  <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>Total a pagar</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {totalFinal !== dynamicTotal && (
                    <Typography
                      variant="body2"
                      sx={{
                        textDecoration: 'line-through',
                        opacity: 0.4,
                        fontWeight: 500
                      }}
                    >
                      $ {totalFinal.toLocaleString('es-AR')}
                    </Typography>
                  )}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 900,
                      fontSize: '1.25rem',
                      color: totalFinal !== dynamicTotal ? '#10B981' : 'white',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    $ {dynamicTotal.toLocaleString('es-AR')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 2, display: 'flex', gap: 2 }}>
          <Button
            onClick={handleRegistrarPago}
            color="primary"
            variant="contained"
            fullWidth
            disabled={registrarLoading}
            sx={{ fontWeight: 600, py: 1.5, opacity: 0.8 }}
          >
            {registrarLoading ? <CircularProgress size={24} color="inherit" /> : (isOperador ? 'Solicitar aprobacion' : 'Registrar pago')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar with Alert for colors */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ open: false, message: '' })}
          severity={snackbar.severity || 'success'}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
